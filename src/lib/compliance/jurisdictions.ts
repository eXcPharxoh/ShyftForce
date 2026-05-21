// Curated rule packs for the worst offenders in Fair Workweek + meal/rest break law.
// Sources: city/state ordinances as of 2026 — admins can override every value in
// ComplianceSettings, these are starting points + "auto-fill from jurisdiction".
//
// We intentionally encode only the schedulable bits (lead time, meal/rest cadence,
// minor caps, predictability pay schedule). Everything else (right-to-rest pay,
// good-faith estimates, etc.) lives in the runbook docs.

export type PredictabilityPaySchedule = {
  // hours of notice before the shift → number of hours of pay owed
  // Example: 24 means "less than 24h notice = 4h pay"
  brackets: { lessThanHoursNotice: number; hoursOwed: number; label: string }[];
};

export type JurisdictionRules = {
  id: string;
  label: string;
  region: string;
  predictiveSchedulingDays: number;
  predictabilityPay: PredictabilityPaySchedule | null;
  mealBreakAfterHours: number;        // owed an unpaid meal break after this many hours
  restBreakAfterHours: number;        // paid 10-min rest break per this many hours (CA-style)
  minRestGapHours: number;            // "right to rest" between shifts
  minorAgeThreshold: number;          // FLSA: under this age triggers minor rules
  minorMaxDailyHours: number;         // school-week cap (override during school)
  minorMaxWeeklyHours: number;
  minorEarliestStartHour: number;     // 24h
  minorLatestEndHour: number;
  notes?: string;
};

export const JURISDICTIONS: Record<string, JurisdictionRules> = {
  default: {
    id: "default",
    label: "Federal default (FLSA only)",
    region: "USA",
    predictiveSchedulingDays: 0,
    predictabilityPay: null,
    mealBreakAfterHours: 6,
    restBreakAfterHours: 0,
    minRestGapHours: 8,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 40,
    minorEarliestStartHour: 7,
    minorLatestEndHour: 19,
    notes: "Federal Fair Labor Standards Act baseline. Most states layer additional rules on top.",
  },
  california: {
    id: "california",
    label: "California",
    region: "CA, USA",
    predictiveSchedulingDays: 0, // statewide doesn't have FW; LA/SF do (separate)
    predictabilityPay: null,
    mealBreakAfterHours: 5,
    restBreakAfterHours: 4,
    minRestGapHours: 8,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 48,
    minorEarliestStartHour: 5,
    minorLatestEndHour: 22,
    notes: "Mandatory 30-min unpaid meal break by hour 5; 10-min paid rest every 4h; daily OT after 8h.",
  },
  new_york_city: {
    id: "new_york_city",
    label: "New York City — Fair Workweek",
    region: "NYC, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 24,  hoursOwed: 1,    label: "Less than 24h notice" },
        { lessThanHoursNotice: 168, hoursOwed: 0.25, label: "Less than 7 days notice (15 min)" },
        { lessThanHoursNotice: 336, hoursOwed: 0.166, label: "Less than 14 days notice (10 min)" },
      ],
    },
    mealBreakAfterHours: 6,
    restBreakAfterHours: 0,
    minRestGapHours: 11,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 28,
    minorEarliestStartHour: 6,
    minorLatestEndHour: 22,
    notes: "Fast-food + retail Fair Workweek: 14-day advance schedule; pay penalties for late changes; right to rest 11h.",
  },
  seattle: {
    id: "seattle",
    label: "Seattle — Secure Scheduling",
    region: "WA, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 24,  hoursOwed: 4,    label: "Less than 24h notice (half-pay 4h)" },
        { lessThanHoursNotice: 336, hoursOwed: 1,    label: "Less than 14 days notice" },
      ],
    },
    mealBreakAfterHours: 5,
    restBreakAfterHours: 4,
    minRestGapHours: 10,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 40,
    minorEarliestStartHour: 7,
    minorLatestEndHour: 21,
    notes: "Applies to retail + food chains (500+ employees worldwide). Right-to-rest = 10h.",
  },
  chicago: {
    id: "chicago",
    label: "Chicago — Fair Workweek",
    region: "IL, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 24,  hoursOwed: 4,    label: "Less than 24h notice (loss = full shift)" },
        { lessThanHoursNotice: 336, hoursOwed: 1,    label: "Less than 14 days notice" },
      ],
    },
    mealBreakAfterHours: 7.5,
    restBreakAfterHours: 0,
    minRestGapHours: 10,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 40,
    minorEarliestStartHour: 7,
    minorLatestEndHour: 21,
    notes: "Covered industries: building services, healthcare, hotels, manufacturing, restaurants, retail, warehouse.",
  },
  philadelphia: {
    id: "philadelphia",
    label: "Philadelphia — Fair Workweek",
    region: "PA, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 24,  hoursOwed: 4,    label: "Less than 24h notice (lost shift)" },
        { lessThanHoursNotice: 336, hoursOwed: 1,    label: "Less than 14 days notice" },
      ],
    },
    mealBreakAfterHours: 6,
    restBreakAfterHours: 0,
    minRestGapHours: 9,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 40,
    minorEarliestStartHour: 7,
    minorLatestEndHour: 22,
    notes: "Retail, hospitality, food: 250+ employees + 30+ locations.",
  },
  los_angeles: {
    id: "los_angeles",
    label: "Los Angeles — Fair Work Week",
    region: "CA, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 24,  hoursOwed: 4,    label: "Less than 24h notice" },
        { lessThanHoursNotice: 336, hoursOwed: 1,    label: "Less than 14 days notice" },
      ],
    },
    mealBreakAfterHours: 5,    // CA state rule
    restBreakAfterHours: 4,
    minRestGapHours: 10,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 48,
    minorEarliestStartHour: 5,
    minorLatestEndHour: 22,
    notes: "Retail Fair Work Week (effective 2023): 300+ employees globally, applies to LA city retail.",
  },
  oregon: {
    id: "oregon",
    label: "Oregon — Fair Work Week (statewide)",
    region: "OR, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 24,  hoursOwed: 4,    label: "Less than 24h notice" },
        { lessThanHoursNotice: 336, hoursOwed: 1,    label: "Less than 14 days notice" },
      ],
    },
    mealBreakAfterHours: 6,
    restBreakAfterHours: 4,
    minRestGapHours: 10,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 44,
    minorEarliestStartHour: 7,
    minorLatestEndHour: 22,
    notes: "Retail, hospitality, food service with 500+ employees worldwide.",
  },
  san_francisco: {
    id: "san_francisco",
    label: "San Francisco — Retail/Formula Bill of Rights",
    region: "CA, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 24,  hoursOwed: 4,    label: "Less than 24h notice (4h pay)" },
        { lessThanHoursNotice: 168, hoursOwed: 1,    label: "Less than 7 days notice (1h pay)" },
        { lessThanHoursNotice: 336, hoursOwed: 0.5,  label: "Less than 14 days notice (30 min)" },
      ],
    },
    mealBreakAfterHours: 5,    // CA state rule
    restBreakAfterHours: 4,
    minRestGapHours: 11,        // 11h between shifts or extra pay
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 48,
    minorEarliestStartHour: 5,
    minorLatestEndHour: 22,
    notes: "Formula retail (20+ locations) + chain restaurants. 14d notice, predictability pay, equal treatment for part-timers.",
  },
  emeryville: {
    id: "emeryville",
    label: "Emeryville — Fair Workweek",
    region: "CA, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 24,  hoursOwed: 4,    label: "Less than 24h notice" },
        { lessThanHoursNotice: 336, hoursOwed: 1,    label: "Less than 14 days notice" },
      ],
    },
    mealBreakAfterHours: 5,
    restBreakAfterHours: 4,
    minRestGapHours: 11,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 48,
    minorEarliestStartHour: 5,
    minorLatestEndHour: 22,
    notes: "Retail (56+ employees) + fast-food (20+ locations globally). 11h right-to-rest mandatory.",
  },
  berkeley: {
    id: "berkeley",
    label: "Berkeley — Fair Workweek",
    region: "CA, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 24,  hoursOwed: 4,    label: "Less than 24h notice" },
        { lessThanHoursNotice: 336, hoursOwed: 1,    label: "Less than 14 days notice" },
      ],
    },
    mealBreakAfterHours: 5,
    restBreakAfterHours: 4,
    minRestGapHours: 11,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 48,
    minorEarliestStartHour: 5,
    minorLatestEndHour: 22,
    notes: "Retail + food: 10+ employees. 14d notice + good-faith hours estimate at hire.",
  },
  // ─── Quebec / CNESST ─────────────────────────────────────────────────────
  // Major win against Agendrix in their home market. Encodes the Loi sur les
  // normes du travail (LNT, RLRQ c N-1.1) + CNESST guidance.
  quebec: {
    id: "quebec",
    label: "Québec — CNESST / LNT",
    region: "QC, Canada",
    predictiveSchedulingDays: 0,            // QC has no statutory predictive scheduling (yet — Bill C-3 watch)
    predictabilityPay: null,
    mealBreakAfterHours: 5,                 // LNT art. 79: 30-min unpaid meal after 5h of consecutive work
    restBreakAfterHours: 0,                 // No statutory paid rest break in QC (collective-agreement only)
    minRestGapHours: 8,                     // LNT art. 78: at least 8h between shifts (or written consent + extra pay)
    minorAgeThreshold: 16,                  // Loi visant à encadrer le travail des enfants (Bill 19, in force 2023)
    minorMaxDailyHours: 10,                 // Under-16 cap on school nights
    minorMaxWeeklyHours: 17,                // Under-16 cap during school weeks (Sept-June)
    minorEarliestStartHour: 6,
    minorLatestEndHour: 23,                 // No work between 11pm-6am for under-16
    notes:
      "Loi sur les normes du travail (LNT) + Bill 19 (child labour). Stat holidays: Jan 1, Good Friday OR Easter Monday, Patriots' Day (Mon before May 25), Saint-Jean-Baptiste (Jun 24), Canada Day (Jul 1), Labour Day, Thanksgiving, Christmas. Indemnity = 1/20 of 4 wks prior wages. RVER opt-in required for 5+ employees w/o group plan.",
  },
  ontario: {
    id: "ontario",
    label: "Ontario — ESA",
    region: "ON, Canada",
    predictiveSchedulingDays: 0,
    predictabilityPay: null,
    mealBreakAfterHours: 5,                 // ESA s.20: 30-min eating period within first 5h
    restBreakAfterHours: 0,
    minRestGapHours: 11,                    // ESA s.18(4): 11h between shifts
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 28,
    minorEarliestStartHour: 6,
    minorLatestEndHour: 22,
    notes:
      "Ontario Employment Standards Act. 3-hour minimum reporting pay for shifts <3h. 11h between shifts mandatory.",
  },
  british_columbia: {
    id: "british_columbia",
    label: "British Columbia — ESA",
    region: "BC, Canada",
    predictiveSchedulingDays: 0,
    predictabilityPay: null,
    mealBreakAfterHours: 5,
    restBreakAfterHours: 0,
    minRestGapHours: 8,
    minorAgeThreshold: 16,
    minorMaxDailyHours: 4,
    minorMaxWeeklyHours: 20,
    minorEarliestStartHour: 7,
    minorLatestEndHour: 22,
    notes:
      "BC ESA. Minimum 2-hour shift pay. Daily OT after 8h, weekly OT after 40h. Stat holidays = avg day's pay.",
  },

  new_york_state_retail: {
    id: "new_york_state_retail",
    label: "New York State — Retail (proposed 2026)",
    region: "NY, USA",
    predictiveSchedulingDays: 14,
    predictabilityPay: {
      brackets: [
        { lessThanHoursNotice: 72,  hoursOwed: 1,    label: "Less than 72h notice" },
      ],
    },
    mealBreakAfterHours: 6,    // NYS Labor Law §162
    restBreakAfterHours: 0,
    minRestGapHours: 11,
    minorAgeThreshold: 18,
    minorMaxDailyHours: 8,
    minorMaxWeeklyHours: 28,
    minorEarliestStartHour: 6,
    minorLatestEndHour: 22,
    notes: "Statewide retail extension of NYC Fair Workweek (S.6796 / A.7864) — apply if you have NYS retail operations.",
  },
};

/** Apply a jurisdiction's rules to a settings object. Returns the merged settings. */
export function applyJurisdiction(
  current: { jurisdiction: string; [k: string]: any },
  jurisdictionId: string,
): {
  jurisdiction: string;
  predictiveSchedulingDays: number;
  mealBreakRequiredAfterHours: number;
  restBreakRequiredAfterHours: number;
  minRestGapHours: number;
  predictabilityPayEnabled: boolean;
  minorAgeThreshold: number;
  minorMaxDailyHours: number;
  minorMaxWeeklyHours: number;
  minorEarliestStartHour: number;
  minorLatestEndHour: number;
} {
  const j = JURISDICTIONS[jurisdictionId] ?? JURISDICTIONS.default;
  return {
    jurisdiction: j.id,
    predictiveSchedulingDays: j.predictiveSchedulingDays,
    mealBreakRequiredAfterHours: j.mealBreakAfterHours,
    restBreakRequiredAfterHours: j.restBreakAfterHours,
    minRestGapHours: j.minRestGapHours,
    predictabilityPayEnabled: !!j.predictabilityPay,
    minorAgeThreshold: j.minorAgeThreshold,
    minorMaxDailyHours: j.minorMaxDailyHours,
    minorMaxWeeklyHours: j.minorMaxWeeklyHours,
    minorEarliestStartHour: j.minorEarliestStartHour,
    minorLatestEndHour: j.minorLatestEndHour,
  };
}

/** Look up the predictability-pay bracket that applies to a given notice window. */
export function predictabilityHoursOwed(
  jurisdictionId: string,
  noticeHours: number,
): { hoursOwed: number; bracketLabel: string } | null {
  const j = JURISDICTIONS[jurisdictionId];
  if (!j?.predictabilityPay) return null;
  // Find smallest bracket that the noticeHours triggers (most specific = smallest threshold)
  const sorted = [...j.predictabilityPay.brackets].sort((a, b) => a.lessThanHoursNotice - b.lessThanHoursNotice);
  for (const b of sorted) {
    if (noticeHours < b.lessThanHoursNotice) return { hoursOwed: b.hoursOwed, bracketLabel: b.label };
  }
  return null;
}
