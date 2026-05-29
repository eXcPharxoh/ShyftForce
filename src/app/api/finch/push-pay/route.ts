import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/session";
import { featureGuard } from "@/lib/feature-guard";
import { FinchAPI } from "@/lib/finch";
import { audit } from "@/lib/audit";
import { overtimeByMember, OT_MULTIPLIER } from "@/lib/payroll/overtime";

// POST /api/finch/push-pay  body: { payPeriodId? }
// For each timesheet entry in the open period, push hours+pay to Finch as a pay statement.
export async function POST(req: Request) {
  // payroll.run — managers get this by default; custom roles can grant it to others.
  const check = await checkPermission("payroll.run");
  if (!check) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ("denied" in check) return NextResponse.json({ error: "You don't have payroll permission." }, { status: 403 });
  const u = check.user;
  const denied = await featureGuard(u.organizationId, "payroll_push");
  if (denied) return denied;
  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
  if (!org?.finchAccessToken) return NextResponse.json({ error: "Finch not connected" }, { status: 400 });

  const { payPeriodId } = (await req.json().catch(() => ({}))) as { payPeriodId?: string };
  // Always scope to org — even when payPeriodId is provided.
  const period = payPeriodId
    ? await prisma.payPeriod.findFirst({
        where: { id: payPeriodId, organizationId: org.id },
        include: { entries: { include: { member: true } } },
      })
    : await prisma.payPeriod.findFirst({
        where: { organizationId: org.id, status: "open" },
        include: { entries: { include: { member: true } } },
      });
  if (!period) return NextResponse.json({ error: "No pay period" }, { status: 404 });

  // Per-member rate + external payroll ID lookup, and the day-level hour
  // entries OT needs (overtime is computed per member-week, not per period total).
  const rateByMember = new Map<string, number>();
  const extIdByMember = new Map<string, string | null>();
  for (const e of period.entries) {
    rateByMember.set(e.memberId, e.member.hourlyRate ?? 0);
    extIdByMember.set(e.memberId, e.member.externalEmployeeId);
  }
  const otByMember = overtimeByMember(
    period.entries.map((e) => ({ memberId: e.memberId, date: e.date, hours: e.hours })),
  );

  let pushed = 0; let skipped = 0; const errors: string[] = [];
  for (const [memberId, split] of otByMember) {
    const externalId = extIdByMember.get(memberId);
    if (!externalId) { skipped++; continue; }
    const rate = rateByMember.get(memberId) ?? 0;
    const regularCents  = Math.round(split.regularHours * rate * 100);
    const overtimeCents = Math.round(split.overtimeHours * rate * OT_MULTIPLIER * 100);
    const grossCents    = regularCents + overtimeCents;
    const totalHours    = split.regularHours + split.overtimeHours;

    // Two earnings lines so the OT premium (0.5×) is paid and reported correctly.
    const earnings = [
      { type: "regular", amount: regularCents, currency: "usd", hours: split.regularHours },
    ];
    if (split.overtimeHours > 0) {
      earnings.push({ type: "overtime", amount: overtimeCents, currency: "usd", hours: split.overtimeHours });
    }

    try {
      await FinchAPI.createPayStatement(org.finchAccessToken, {
        individual_id: externalId,
        type: "regular_payroll",
        total_hours: totalHours,
        gross_pay: { amount: grossCents, currency: "usd" },
        earnings,
      });
      pushed++;
    } catch (e: any) {
      errors.push(`${memberId}: ${e.message ?? "push failed"}`);
    }
  }

  await audit({
    organizationId: org.id, actorId: u.id,
    action: "billing.checkout", entityType: "Finch.payroll",
    metadata: { payPeriodId: period.id, pushed, skipped, errors: errors.length },
  });

  return NextResponse.json({ pushed, skipped, errors });
}
