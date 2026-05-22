// Earned-but-unpaid wage calculator. Sums approved timesheet hours since the
// member's last completed pay period (or the start of the current open one),
// applies hourlyRate, then applies the org's earnedRatePercent + per-period cap,
// minus any pending/settled withdrawals already taken this period.

import { prisma } from "@/lib/prisma";
import { overtimeByMember, grossCents, type HourEntry, type OtSplit } from "@/lib/payroll/overtime";

export type EwaBalance = {
  memberId: string;
  organizationId: string;
  enabled: boolean;
  payPeriodId: string | null;
  payPeriodStartsOn: Date | null;
  payPeriodEndsOn: Date | null;
  hoursWorked: number;
  hourlyRate: number;
  grossEarnedCents: number;        // raw $ earned this period
  accessibleCents: number;         // grossEarned * earnedRatePercent
  alreadyTakenCents: number;       // pending+settled withdrawals this period
  capCents: number;                // org-set max per period
  availableCents: number;          // min(accessible, cap) - alreadyTaken
  feeCentsPerWithdrawal: number;
  minWithdrawalCents: number;
  blockReason?: string | null;     // "ewa_disabled" | "below_minimum" | "cap_reached" | null
};

export async function getEwaBalance(opts: { memberId: string; organizationId: string; now?: Date }): Promise<EwaBalance> {
  const now = opts.now ?? new Date();

  const [member, settings, openPeriod] = await Promise.all([
    prisma.member.findFirst({ where: { id: opts.memberId, organizationId: opts.organizationId } }),
    prisma.ewaSettings.findUnique({ where: { organizationId: opts.organizationId } }),
    prisma.payPeriod.findFirst({ where: { organizationId: opts.organizationId, status: "open" } }),
  ]);
  if (!member) throw new Error("member not in org");

  const enabled = !!settings?.enabled;
  const earnedRatePercent = settings?.earnedRatePercent ?? 50;
  const feeCentsPerWithdrawal = settings?.feeCentsPerWithdrawal ?? 199;
  const minWithdrawalCents = settings?.minWithdrawalCents ?? 2000;
  const maxPerPayPeriodCents = settings?.maxPerPayPeriodCents ?? 50_000;

  const hourlyRate = member.hourlyRate ?? 0;

  // Earned wages from the current open pay period (approved entries only),
  // split into regular vs OT so the accessible amount can never exceed what
  // real (OT-adjusted) payroll will actually pay out.
  let split: OtSplit = { regularHours: 0, overtimeHours: 0 };
  if (openPeriod) {
    const entries = await prisma.timesheetEntry.findMany({
      where: { payPeriodId: openPeriod.id, memberId: member.id, approved: true },
    });
    split = overtimeByMember(
      entries.map((e) => ({ memberId: member.id, date: e.date, hours: e.hours })),
    ).get(member.id) ?? split;
  } else {
    // Fall back to attendance logs since the most recently completed pay period
    const lastClosed = await prisma.payPeriod.findFirst({
      where: { organizationId: opts.organizationId, status: { not: "open" } },
      orderBy: { endsOn: "desc" },
    });
    const since = lastClosed?.endsOn ?? new Date(now.getTime() - 14 * 86400_000);
    // Pair clock_in/clock_out events into discrete shifts. A dangling clock_in
    // (missing its clock_out) is dropped rather than merged into the next shift,
    // so a forgotten punch-out can't inflate earned wages.
    const logs = await prisma.attendanceLog.findMany({
      where: { memberId: member.id, at: { gte: since, lte: now } },
      orderBy: { at: "asc" },
    });
    const shifts: HourEntry[] = [];
    let openShiftStart: Date | null = null;
    for (const l of logs) {
      if (l.type === "clock_in") openShiftStart = l.at;
      else if (l.type === "clock_out" && openShiftStart) {
        shifts.push({ memberId: member.id, date: openShiftStart, hours: (+l.at - +openShiftStart) / 3600_000 });
        openShiftStart = null;
      }
    }
    split = overtimeByMember(shifts).get(member.id) ?? split;
  }

  const hoursWorked = split.regularHours + split.overtimeHours;
  const grossEarnedCents = Math.max(0, grossCents(split, hourlyRate));
  const accessibleCents = Math.round(grossEarnedCents * (earnedRatePercent / 100));

  // Withdrawals taken this period (pending + settled)
  const periodStart = openPeriod?.startsOn ?? new Date(now.getTime() - 14 * 86400_000);
  const taken = await prisma.ewaWithdrawal.findMany({
    where: {
      memberId: member.id,
      organizationId: opts.organizationId,
      requestedAt: { gte: periodStart },
      status: { in: ["pending", "processing", "settled"] },
    },
    select: { amountCents: true },
  });
  const alreadyTakenCents = taken.reduce((a, t) => a + t.amountCents, 0);

  const cappedAccessible = Math.min(accessibleCents, maxPerPayPeriodCents);
  const availableCents = Math.max(0, cappedAccessible - alreadyTakenCents);

  let blockReason: string | null = null;
  if (!enabled) blockReason = "ewa_disabled";
  else if (availableCents < minWithdrawalCents) blockReason = availableCents > 0 ? "below_minimum" : alreadyTakenCents >= cappedAccessible ? "cap_reached" : "below_minimum";

  return {
    memberId: member.id,
    organizationId: opts.organizationId,
    enabled,
    payPeriodId: openPeriod?.id ?? null,
    payPeriodStartsOn: openPeriod?.startsOn ?? null,
    payPeriodEndsOn: openPeriod?.endsOn ?? null,
    hoursWorked,
    hourlyRate,
    grossEarnedCents,
    accessibleCents,
    alreadyTakenCents,
    capCents: maxPerPayPeriodCents,
    availableCents,
    feeCentsPerWithdrawal,
    minWithdrawalCents,
    blockReason,
  };
}
