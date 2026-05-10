// Pure compliance engine — no DB or framework deps so it can run server-side
// against a saved schedule OR against an in-memory AI proposal.

export type Severity = "error" | "warning";

export type Violation = {
  rule: string;          // machine-readable rule id
  ruleLabel: string;     // human-readable rule name
  severity: Severity;
  memberId: string;
  memberName: string;
  message: string;
  shiftIds: string[];
  recommendation?: string;
};

export type ComplianceSettings = {
  maxWeeklyHours: number;
  maxDailyHours: number;
  minRestGapHours: number;
  mealBreakRequiredAfterHours: number;
  restBreakRequiredAfterHours: number;
  maxConsecutiveDays: number;
  predictiveSchedulingDays: number;  // 0 = disabled
  jurisdiction?: string;
  predictabilityPayEnabled?: boolean;
  minorAgeThreshold?: number;
  minorMaxDailyHours?: number;
  minorMaxWeeklyHours?: number;
  minorEarliestStartHour?: number;
  minorLatestEndHour?: number;
};

export const DEFAULT_SETTINGS: ComplianceSettings = {
  maxWeeklyHours: 40,
  maxDailyHours: 12,
  minRestGapHours: 8,
  mealBreakRequiredAfterHours: 5,
  restBreakRequiredAfterHours: 0,
  maxConsecutiveDays: 6,
  predictiveSchedulingDays: 0,
  jurisdiction: "default",
  predictabilityPayEnabled: false,
  minorAgeThreshold: 18,
  minorMaxDailyHours: 8,
  minorMaxWeeklyHours: 40,
  minorEarliestStartHour: 7,
  minorLatestEndHour: 19,
};

export type ShiftLite = {
  id: string;
  memberId: string | null;
  startsAt: Date;
  endsAt: Date;
  status?: string;     // "draft" | "published"
  createdAt?: Date;
};

export type MemberLite = { id: string; name: string; birthday?: Date | null };

export type CheckInput = {
  shifts: ShiftLite[];
  members: MemberLite[];
  settings?: Partial<ComplianceSettings>;
  publishingNow?: boolean;  // for predictive scheduling rule
  now?: Date;
};

export function checkCompliance(input: CheckInput): Violation[] {
  const settings = { ...DEFAULT_SETTINGS, ...(input.settings ?? {}) };
  const violations: Violation[] = [];
  const memberById = new Map(input.members.map(m => [m.id, m]));

  // Group shifts by member
  const byMember = new Map<string, ShiftLite[]>();
  for (const s of input.shifts) {
    if (!s.memberId) continue;
    if (!byMember.has(s.memberId)) byMember.set(s.memberId, []);
    byMember.get(s.memberId)!.push(s);
  }

  for (const [memberId, shifts] of byMember) {
    const member = memberById.get(memberId);
    const memberName = member?.name ?? "Unknown";
    const sorted = [...shifts].sort((a, b) => +a.startsAt - +b.startsAt);

    // 1. Weekly OT
    for (const [weekKey, weekShifts] of groupByWeek(sorted)) {
      const totalH = weekShifts.reduce((a, s) => a + hours(s), 0);
      if (totalH > settings.maxWeeklyHours) {
        violations.push({
          rule: "overtime_weekly",
          ruleLabel: "Weekly overtime",
          severity: "warning",
          memberId, memberName,
          message: `${memberName} scheduled ${totalH.toFixed(1)}h the week of ${weekKey} (limit ${settings.maxWeeklyHours}h)`,
          shiftIds: weekShifts.map(s => s.id),
          recommendation: `Reduce by ${(totalH - settings.maxWeeklyHours).toFixed(1)}h or pre-approve overtime`,
        });
      }
    }

    // 2. Daily OT
    for (const [dayKey, dayShifts] of groupByDay(sorted)) {
      const totalH = dayShifts.reduce((a, s) => a + hours(s), 0);
      if (totalH > settings.maxDailyHours) {
        violations.push({
          rule: "overtime_daily",
          ruleLabel: "Daily overtime",
          severity: "warning",
          memberId, memberName,
          message: `${memberName} scheduled ${totalH.toFixed(1)}h on ${dayKey} (limit ${settings.maxDailyHours}h/day)`,
          shiftIds: dayShifts.map(s => s.id),
        });
      }
    }

    // 3. Rest gap between consecutive shifts
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i-1], cur = sorted[i];
      const gapH = (+cur.startsAt - +prev.endsAt) / 3600000;
      if (gapH >= 0 && gapH < settings.minRestGapHours) {
        violations.push({
          rule: "rest_gap",
          ruleLabel: "Rest gap",
          severity: "error",
          memberId, memberName,
          message: `${memberName} has only ${gapH.toFixed(1)}h between shifts on ${prev.endsAt.toLocaleDateString()} → ${cur.startsAt.toLocaleDateString()} (min ${settings.minRestGapHours}h)`,
          shiftIds: [prev.id, cur.id],
          recommendation: `Move the second shift later by ${(settings.minRestGapHours - gapH).toFixed(1)}h`,
        });
      }
    }

    // 4. Meal break needed (long shift)
    for (const s of sorted) {
      const h = hours(s);
      if (h > settings.mealBreakRequiredAfterHours) {
        violations.push({
          rule: "meal_break",
          ruleLabel: "Meal break required",
          severity: "warning",
          memberId, memberName,
          message: `${memberName}'s ${h.toFixed(1)}h shift on ${s.startsAt.toLocaleDateString()} requires a meal break`,
          shiftIds: [s.id],
          recommendation: `Schedule a 30-min break after ${settings.mealBreakRequiredAfterHours}h`,
        });
      }
    }

    // 4b. Rest break required (CA-style 10-min paid every N hours)
    if ((settings.restBreakRequiredAfterHours ?? 0) > 0) {
      for (const s of sorted) {
        const h = hours(s);
        if (h > settings.restBreakRequiredAfterHours!) {
          violations.push({
            rule: "rest_break",
            ruleLabel: "Paid rest break required",
            severity: "warning",
            memberId, memberName,
            message: `${memberName}'s ${h.toFixed(1)}h shift on ${s.startsAt.toLocaleDateString()} requires a 10-min paid rest break`,
            shiftIds: [s.id],
            recommendation: `Required: 10-min paid rest break per ${settings.restBreakRequiredAfterHours}h worked`,
          });
        }
      }
    }

    // 4c. Minor labor protections (under-age threshold)
    const minorThreshold = settings.minorAgeThreshold ?? 18;
    if (member?.birthday) {
      const age = ageInYears(member.birthday, input.now ?? new Date());
      if (age < minorThreshold) {
        // 4c.i daily/weekly hour caps
        const minorMaxDaily = settings.minorMaxDailyHours ?? 8;
        const minorMaxWeekly = settings.minorMaxWeeklyHours ?? 40;
        for (const [dayKey, dayShifts] of groupByDay(sorted)) {
          const totalH = dayShifts.reduce((a, s) => a + hours(s), 0);
          if (totalH > minorMaxDaily) {
            violations.push({
              rule: "minor_daily_hours",
              ruleLabel: "Minor daily hour cap",
              severity: "error",
              memberId, memberName,
              message: `${memberName} (age ${age}) scheduled ${totalH.toFixed(1)}h on ${dayKey} — minors capped at ${minorMaxDaily}h/day`,
              shiftIds: dayShifts.map(s => s.id),
            });
          }
        }
        for (const [weekKey, weekShifts] of groupByWeek(sorted)) {
          const totalH = weekShifts.reduce((a, s) => a + hours(s), 0);
          if (totalH > minorMaxWeekly) {
            violations.push({
              rule: "minor_weekly_hours",
              ruleLabel: "Minor weekly hour cap",
              severity: "error",
              memberId, memberName,
              message: `${memberName} (age ${age}) scheduled ${totalH.toFixed(1)}h the week of ${weekKey} — minors capped at ${minorMaxWeekly}h/week`,
              shiftIds: weekShifts.map(s => s.id),
            });
          }
        }
        // 4c.ii start/end hour windows
        const earliest = settings.minorEarliestStartHour ?? 7;
        const latest = settings.minorLatestEndHour ?? 19;
        for (const s of sorted) {
          const startH = s.startsAt.getHours();
          const endH = s.endsAt.getHours() + (s.endsAt.getMinutes() > 0 ? 1 : 0);
          if (startH < earliest || endH > latest) {
            violations.push({
              rule: "minor_hours_window",
              ruleLabel: "Minor work-hours window",
              severity: "error",
              memberId, memberName,
              message: `${memberName} (age ${age}) scheduled outside minor work-hours window (${earliest}:00–${latest}:00) on ${s.startsAt.toLocaleDateString()}`,
              shiftIds: [s.id],
              recommendation: `Adjust shift to fit ${earliest}:00–${latest}:00`,
            });
          }
        }
      }
    }

    // 5. Consecutive days
    const days = [...new Set(sorted.map(s => isoDate(s.startsAt)))].sort();
    let consecutive = 1; let runStart = days[0]; let runEnd = days[0];
    for (let i = 1; i < days.length; i++) {
      const diff = (+new Date(days[i]) - +new Date(days[i-1])) / 86400000;
      if (Math.round(diff) === 1) { consecutive++; runEnd = days[i]; }
      else { consecutive = 1; runStart = days[i]; runEnd = days[i]; }
      if (consecutive > settings.maxConsecutiveDays) {
        const runDays = sorted.filter(s => {
          const k = isoDate(s.startsAt); return k >= runStart && k <= runEnd;
        });
        violations.push({
          rule: "consecutive_days",
          ruleLabel: "Consecutive days",
          severity: "warning",
          memberId, memberName,
          message: `${memberName} scheduled ${consecutive} days in a row (${runStart} → ${runEnd}). Max ${settings.maxConsecutiveDays}.`,
          shiftIds: runDays.map(s => s.id),
          recommendation: `Insert a rest day inside this run`,
        });
        // Don't repeatedly emit; jump past this run
        consecutive = 1; runStart = days[i]; runEnd = days[i];
      }
    }
  }

  // 6. Predictive scheduling (org-wide)
  if (settings.predictiveSchedulingDays > 0 && input.publishingNow) {
    const minLeadMs = settings.predictiveSchedulingDays * 86400000;
    const now = Date.now();
    const lateShifts = input.shifts.filter(s => s.status === "draft" && +s.startsAt - now < minLeadMs);
    if (lateShifts.length > 0) {
      violations.push({
        rule: "predictive_scheduling",
        ruleLabel: "Predictive scheduling",
        severity: "warning",
        memberId: "*",
        memberName: "Multiple",
        message: `${lateShifts.length} shift${lateShifts.length === 1 ? "" : "s"} starting in fewer than ${settings.predictiveSchedulingDays} days from now`,
        shiftIds: lateShifts.map(s => s.id),
        recommendation: `Publish ≥${settings.predictiveSchedulingDays} days in advance per Fair Workweek rules`,
      });
    }
  }

  return violations.sort((a, b) =>
    a.severity === b.severity ? a.memberName.localeCompare(b.memberName) : a.severity === "error" ? -1 : 1
  );
}

// ---------- helpers ----------
function hours(s: ShiftLite): number { return (+s.endsAt - +s.startsAt) / 3600000; }
function isoDate(d: Date): string { const x = new Date(d); x.setHours(0,0,0,0); return x.toISOString().slice(0,10); }
function ageInYears(birthday: Date, now: Date): number {
  const b = new Date(birthday);
  let age = now.getFullYear() - b.getFullYear();
  const beforeBirthday = now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function groupByWeek(shifts: ShiftLite[]): Map<string, ShiftLite[]> {
  const map = new Map<string, ShiftLite[]>();
  for (const s of shifts) {
    const d = new Date(s.startsAt); d.setHours(0,0,0,0);
    const dow = d.getDay();                       // 0 = Sun
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const key = isoDate(monday);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

function groupByDay(shifts: ShiftLite[]): Map<string, ShiftLite[]> {
  const map = new Map<string, ShiftLite[]>();
  for (const s of shifts) {
    const key = isoDate(s.startsAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

// Convenience: format violation rule for display
export const RULE_META: Record<string, { label: string; emoji: string }> = {
  overtime_weekly:        { label: "Weekly OT",          emoji: "📊" },
  overtime_daily:         { label: "Daily OT",           emoji: "⏱️" },
  rest_gap:               { label: "Rest gap",           emoji: "🛌" },
  meal_break:             { label: "Meal break",         emoji: "🍽️" },
  rest_break:             { label: "Rest break",         emoji: "☕" },
  consecutive_days:       { label: "Consec. days",       emoji: "📅" },
  predictive_scheduling:  { label: "Fair Workweek",      emoji: "📜" },
  minor_daily_hours:      { label: "Minor daily cap",    emoji: "🧒" },
  minor_weekly_hours:     { label: "Minor weekly cap",   emoji: "🧒" },
  minor_hours_window:     { label: "Minor work hours",   emoji: "🧒" },
};
