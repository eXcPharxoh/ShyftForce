// Shared overtime engine.
//
// Splits worked hours into regular vs overtime using the GREATER of the daily
// (>8h/day) and weekly (>40h/week) thresholds, computed per member-week. We take
// the MAX of the two (anti-pyramiding) rather than summing them — that matches
// FLSA weekly OT plus daily-OT jurisdictions (California, several Canadian
// provinces) without ever double-counting an hour as both daily and weekly OT.
//
// This is the single source of truth for OT. Payroll push (Finch), EWA, and
// client billing all funnel through here so the three never disagree.

export const DAILY_OT_THRESHOLD = 8;
export const WEEKLY_OT_THRESHOLD = 40;
export const OT_MULTIPLIER = 1.5;

export type HourEntry = {
  memberId: string;
  date: Date;
  hours: number;
};

export type OtSplit = { regularHours: number; overtimeHours: number };

/** UTC calendar-day key (avoids server-TZ drift when bucketing into days). */
function isoDay(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

/** Monday-anchored UTC ISO-week key. */
function isoWeek(d: Date): string {
  const x = new Date(d);
  const dow = (x.getUTCDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  x.setUTCDate(x.getUTCDate() - dow);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

/**
 * Split a flat list of hour entries into regular/OT, allocated PER ENTRY.
 * Within each member-week, weekly OT is distributed across that week's entries
 * proportionally to their hours, so callers can re-aggregate by location/day.
 * Returned items carry the original entry fields plus regularHours/overtimeHours.
 * Note: output order is NOT guaranteed (entries are regrouped by member-week).
 */
export function splitOvertime<T extends HourEntry>(entries: T[]): (T & OtSplit)[] {
  const groups = new Map<string, T[]>();
  for (const e of entries) {
    const k = `${e.memberId}|${isoWeek(e.date)}`;
    const g = groups.get(k);
    if (g) g.push(e);
    else groups.set(k, [e]);
  }

  const out: (T & OtSplit)[] = [];
  for (const group of groups.values()) {
    const weekTotal = group.reduce((a, e) => a + e.hours, 0);

    // Daily OT: sum of (dayHours - 8)+ across the week's days
    const byDay = new Map<string, number>();
    for (const e of group) byDay.set(isoDay(e.date), (byDay.get(isoDay(e.date)) ?? 0) + e.hours);
    let dailyOT = 0;
    for (const h of byDay.values()) dailyOT += Math.max(0, h - DAILY_OT_THRESHOLD);

    // Weekly OT: (weekTotal - 40)+
    const weeklyOT = Math.max(0, weekTotal - WEEKLY_OT_THRESHOLD);

    const weekOT = Math.max(dailyOT, weeklyOT);
    const otFraction = weekTotal > 0 ? weekOT / weekTotal : 0;

    for (const e of group) {
      const overtimeHours = e.hours * otFraction;
      out.push({ ...e, overtimeHours, regularHours: e.hours - overtimeHours });
    }
  }
  return out;
}

/** Aggregate regular/OT per member across all supplied entries. */
export function overtimeByMember(entries: HourEntry[]): Map<string, OtSplit> {
  const m = new Map<string, OtSplit>();
  for (const e of splitOvertime(entries)) {
    const cur = m.get(e.memberId) ?? { regularHours: 0, overtimeHours: 0 };
    cur.regularHours += e.regularHours;
    cur.overtimeHours += e.overtimeHours;
    m.set(e.memberId, cur);
  }
  return m;
}

/** Gross pay in integer cents for an OT split at an hourly rate (USD). */
export function grossCents(split: OtSplit, hourlyRateUSD: number, multiplier = OT_MULTIPLIER): number {
  const regular = split.regularHours * hourlyRateUSD;
  const overtime = split.overtimeHours * hourlyRateUSD * multiplier;
  return Math.round((regular + overtime) * 100);
}
