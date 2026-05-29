// Shared shift-eligibility logic used by both /api/schedule/auto-fill and
// /api/schedule/shift-suggestions. Honors:
//   • TimeOffRequest (status: approved | pending)  → never assign during their PTO
//   • AvailabilityRule (recurring_unavailable + one_off_unavailable) →
//                                                    respect what they told us
//
// Built as a precomputed bag so the autofill loop can run hundreds of times
// without making a query per (shift × member) pair.

import { prisma } from "../prisma";

type TimeOffRow = { memberId: string; startsOn: Date; endsOn: Date; status: string; category: string };
type AvailabilityRow = { memberId: string; type: string; dayOfWeek: number | null; startTime: string | null; endTime: string | null; date: Date | null };

export type EligibilityData = {
  timeOffByMember:      Map<string, TimeOffRow[]>;
  availabilityByMember: Map<string, AvailabilityRow[]>;
};

/** Load every constraint that could disqualify a member from a shift this week. */
export async function loadEligibilityData(
  organizationId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<EligibilityData> {
  const [timeOff, availability] = await Promise.all([
    prisma.timeOffRequest.findMany({
      where: {
        member: { organizationId },
        status: { in: ["approved", "pending"] },
        // Overlap with the requested window.
        startsOn: { lt: windowEnd },
        endsOn:   { gte: windowStart },
      },
      select: { memberId: true, startsOn: true, endsOn: true, status: true, category: true },
    }),
    prisma.availabilityRule.findMany({
      where: { member: { organizationId } },
      select: { memberId: true, type: true, dayOfWeek: true, startTime: true, endTime: true, date: true },
    }),
  ]);

  const timeOffByMember = new Map<string, TimeOffRow[]>();
  for (const t of timeOff) {
    const arr = timeOffByMember.get(t.memberId);
    if (arr) arr.push(t); else timeOffByMember.set(t.memberId, [t]);
  }
  const availabilityByMember = new Map<string, AvailabilityRow[]>();
  for (const a of availability) {
    const arr = availabilityByMember.get(a.memberId);
    if (arr) arr.push(a); else availabilityByMember.set(a.memberId, [a]);
  }
  return { timeOffByMember, availabilityByMember };
}

function timeRangeOverlaps(
  ruleStart: string | null, ruleEnd: string | null,
  shiftStartMin: number, shiftEndMin: number,
): boolean {
  if (!ruleStart || !ruleEnd) return true; // whole-day rule applies regardless
  const [rsh, rsm] = ruleStart.split(":").map(Number);
  const [reh, rem] = ruleEnd.split(":").map(Number);
  const rs = rsh * 60 + rsm;
  const re = reh * 60 + rem;
  return rs < shiftEndMin && re > shiftStartMin;
}

/** Returns null if eligible; otherwise a short reason string for the UI. */
export function disqualifyingReason(
  memberId: string,
  shiftStart: Date,
  shiftEnd: Date,
  data: EligibilityData,
): string | null {
  // ---- Time-off (covers any overlap with an approved or pending request)
  const offs = data.timeOffByMember.get(memberId) ?? [];
  for (const t of offs) {
    if (t.startsOn <= shiftEnd && t.endsOn >= shiftStart) {
      return t.status === "approved" ? "on approved time-off" : "pending time-off request";
    }
  }
  // ---- Availability rules
  const rules = data.availabilityByMember.get(memberId) ?? [];
  const dow = shiftStart.getDay();
  const shiftStartMin = shiftStart.getHours() * 60 + shiftStart.getMinutes();
  const shiftEndMin = shiftEnd.getHours() * 60 + shiftEnd.getMinutes();
  for (const r of rules) {
    if (r.type === "recurring_unavailable" && r.dayOfWeek === dow) {
      if (timeRangeOverlaps(r.startTime, r.endTime, shiftStartMin, shiftEndMin)) {
        return "unavailable per their schedule";
      }
    } else if (r.type === "one_off_unavailable" && r.date) {
      if (new Date(r.date).toDateString() === shiftStart.toDateString()) {
        if (timeRangeOverlaps(r.startTime, r.endTime, shiftStartMin, shiftEndMin)) {
          return "marked unavailable that day";
        }
      }
    }
  }
  return null;
}
