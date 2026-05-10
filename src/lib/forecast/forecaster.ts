// Pure demand forecaster. Takes historical revenue snapshots + context events,
// produces a per-30min revenue prediction for the upcoming N days. Deterministic,
// no AI calls — that lives in lib/forecast/context.ts as a separate enrichment step.
//
// Method:
//   1. Bucket history into (dayOfWeek, slotOfDay) cells, take the median value
//      across the last 8 weeks (robust to outliers like a one-off concert).
//   2. Apply a recent-trend multiplier: median of last 2 weeks ÷ median of prior 6.
//   3. Apply context multipliers from ContextEvent rows that overlap each slot.
//   4. Confidence = how many history samples we had / 8.

const SLOT_MIN = 30;
const SLOTS_PER_DAY = (24 * 60) / SLOT_MIN; // 48
const LOOKBACK_WEEKS = 8;
const RECENT_WEEKS = 2;

export type HistorySnap = {
  intervalStart: Date;
  intervalEnd: Date;
  grossSalesCents: number;
};

export type ContextEvent = {
  startsAt: Date;
  endsAt: Date;
  expectedImpactPct: number; // -100 to +100
  label: string;
};

export type ForecastSlot = {
  slotStart: Date;
  slotEnd: Date;
  predictedRevenueCents: number;
  confidence: number;
  contextNotes: string | null;
};

export type ForecasterInput = {
  history: HistorySnap[];
  contextEvents: ContextEvent[];
  weekStart: Date;        // local Monday 00:00
  daysAhead?: number;     // default 7
  now?: Date;
};

export function forecast(input: ForecasterInput): ForecastSlot[] {
  const days = input.daysAhead ?? 7;
  const now = input.now ?? new Date();

  // 1) Bucket history by (dow, slotIdx)
  // Key: dow*100 + slotIdx → array of cents-per-slot values
  const buckets = new Map<number, { all: number[]; recent: number[]; old: number[] }>();
  const cutoffRecent = new Date(now.getTime() - RECENT_WEEKS * 7 * 86400_000);
  const cutoffLookback = new Date(now.getTime() - LOOKBACK_WEEKS * 7 * 86400_000);

  for (const snap of input.history) {
    if (snap.intervalStart < cutoffLookback) continue;
    // Distribute the snapshot's revenue into 30-min slots it overlaps
    const totalMs = +snap.intervalEnd - +snap.intervalStart;
    if (totalMs <= 0) continue;
    const cents = snap.grossSalesCents;
    let cur = new Date(snap.intervalStart);
    while (cur < snap.intervalEnd) {
      const slotStart = floorToSlot(cur);
      const slotEnd = new Date(slotStart.getTime() + SLOT_MIN * 60_000);
      const overlap = Math.min(+slotEnd, +snap.intervalEnd) - Math.max(+slotStart, +snap.intervalStart);
      const portion = (overlap / totalMs) * cents;
      const dow = slotStart.getDay();
      const slotIdx = (slotStart.getHours() * 60 + slotStart.getMinutes()) / SLOT_MIN;
      const key = dow * 100 + slotIdx;
      if (!buckets.has(key)) buckets.set(key, { all: [], recent: [], old: [] });
      const b = buckets.get(key)!;
      b.all.push(portion);
      if (slotStart >= cutoffRecent) b.recent.push(portion); else b.old.push(portion);
      cur = slotEnd;
    }
  }

  // 2) Compute recent-trend multiplier (single global ratio, not per-slot to avoid noise)
  const allRecent = [...buckets.values()].flatMap((b) => b.recent);
  const allOld    = [...buckets.values()].flatMap((b) => b.old);
  const trendMultiplier = (median(allRecent) > 0 && median(allOld) > 0)
    ? clamp(median(allRecent) / median(allOld), 0.5, 2)
    : 1;

  // 3) Generate slots for the forecast window
  const out: ForecastSlot[] = [];
  for (let d = 0; d < days; d++) {
    const dayStart = new Date(input.weekStart.getTime() + d * 86400_000);
    for (let s = 0; s < SLOTS_PER_DAY; s++) {
      const slotStart = new Date(dayStart.getTime() + s * SLOT_MIN * 60_000);
      const slotEnd   = new Date(slotStart.getTime() + SLOT_MIN * 60_000);
      const dow = slotStart.getDay();
      const key = dow * 100 + s;
      const b = buckets.get(key);
      const baseline = b ? median(b.all) : 0;
      let predictedCents = Math.round(baseline * trendMultiplier);

      // 4) Context multipliers
      const overlapping = input.contextEvents.filter((c) =>
        c.startsAt < slotEnd && c.endsAt > slotStart
      );
      let multiplier = 1;
      const notes: string[] = [];
      for (const ev of overlapping) {
        multiplier *= 1 + ev.expectedImpactPct / 100;
        notes.push(`${ev.label}${ev.expectedImpactPct >= 0 ? "+" : ""}${ev.expectedImpactPct}%`);
      }
      predictedCents = Math.max(0, Math.round(predictedCents * multiplier));

      const samples = b?.all.length ?? 0;
      const confidence = clamp(samples / LOOKBACK_WEEKS, 0, 1);

      out.push({
        slotStart, slotEnd, predictedRevenueCents: predictedCents, confidence,
        contextNotes: notes.length > 0 ? notes.join(" · ") : null,
      });
    }
  }
  return out;
}

function floorToSlot(d: Date): Date {
  const x = new Date(d);
  const minutes = x.getMinutes();
  x.setMinutes(minutes - (minutes % SLOT_MIN), 0, 0);
  return x;
}
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
function clamp(x: number, lo: number, hi: number): number { return Math.min(hi, Math.max(lo, x)); }
