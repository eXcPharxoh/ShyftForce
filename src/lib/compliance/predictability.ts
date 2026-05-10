// Predictability pay (a.k.a. "schedule change pay") computation per Fair Workweek
// jurisdictions. When a manager adds, moves, cancels, or shortens a published shift
// inside the lead-time window, the employer owes predictability pay.

import { prisma } from "@/lib/prisma";
import { predictabilityHoursOwed, JURISDICTIONS } from "./jurisdictions";

export type ChangeType = "added" | "moved" | "canceled" | "shortened";

export type PredictabilityCalcInput = {
  organizationId: string;
  shiftId: string;
  memberId: string;
  changeType: ChangeType;
  shiftStartsAt: Date;
  hourlyRate: number;
  jurisdiction: string;
  now?: Date;
  reason?: string;
};

export type PredictabilityResult = {
  triggered: boolean;
  bracketLabel?: string;
  noticeHours: number;
  hoursOwed: number;
  hourlyRate: number;
  amountOwedCents: number;
};

/** Pure: figure out what (if anything) is owed without writing to DB. */
export function calcPredictability(input: Omit<PredictabilityCalcInput, "organizationId">): PredictabilityResult {
  const now = input.now ?? new Date();
  const noticeHours = Math.max(0, (+input.shiftStartsAt - +now) / 3600_000);
  const owed = predictabilityHoursOwed(input.jurisdiction, noticeHours);
  if (!owed) return { triggered: false, noticeHours, hoursOwed: 0, hourlyRate: input.hourlyRate, amountOwedCents: 0 };
  const amountOwedCents = Math.round(owed.hoursOwed * input.hourlyRate * 100);
  return {
    triggered: true,
    bracketLabel: owed.bracketLabel,
    noticeHours,
    hoursOwed: owed.hoursOwed,
    hourlyRate: input.hourlyRate,
    amountOwedCents,
  };
}

/** Calc + persist a PredictabilityPayEvent if owed. Idempotent per (shiftId,changeType,memberId,~hour). */
export async function recordPredictabilityIfOwed(input: PredictabilityCalcInput): Promise<PredictabilityResult> {
  const result = calcPredictability(input);
  if (!result.triggered) return result;

  await prisma.predictabilityPayEvent.create({
    data: {
      organizationId: input.organizationId,
      shiftId: input.shiftId,
      memberId: input.memberId,
      changeType: input.changeType,
      shiftStartsAt: input.shiftStartsAt,
      noticeHours: result.noticeHours,
      hoursOwed: result.hoursOwed,
      hourlyRate: input.hourlyRate,
      amountOwedCents: result.amountOwedCents,
      reason: input.reason ?? null,
    },
  });

  return result;
}

/** List unresolved predictability events with totals — for the Compliance Center ledger. */
export async function unresolvedPredictabilityForOrg(organizationId: string) {
  const events = await prisma.predictabilityPayEvent.findMany({
    where: { organizationId, resolvedAt: null },
    include: {
      member: { include: { user: true } },
      shift: { include: { location: true } },
    },
    orderBy: { occurredAt: "desc" },
  });
  const totalOwedCents = events.reduce((a, e) => a + e.amountOwedCents, 0);
  const byMember = new Map<string, { name: string; cents: number; events: number }>();
  for (const e of events) {
    const name = e.member.user.name;
    const slot = byMember.get(e.memberId) ?? { name, cents: 0, events: 0 };
    slot.cents += e.amountOwedCents;
    slot.events += 1;
    byMember.set(e.memberId, slot);
  }
  return { events, totalOwedCents, byMember: [...byMember.entries()].map(([id, v]) => ({ memberId: id, ...v })) };
}

export function jurisdictionLabel(id: string): string {
  return JURISDICTIONS[id]?.label ?? id;
}
