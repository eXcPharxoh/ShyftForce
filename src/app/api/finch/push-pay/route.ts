import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { FinchAPI } from "@/lib/finch";
import { audit } from "@/lib/audit";

// POST /api/finch/push-pay  body: { payPeriodId? }
// For each timesheet entry in the open period, push hours+pay to Finch as a pay statement.
export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
  if (!org?.finchAccessToken) return NextResponse.json({ error: "Finch not connected" }, { status: 400 });

  const { payPeriodId } = (await req.json().catch(() => ({}))) as { payPeriodId?: string };
  const period = payPeriodId
    ? await prisma.payPeriod.findUnique({ where: { id: payPeriodId }, include: { entries: { include: { member: true } } } })
    : await prisma.payPeriod.findFirst({ where: { organizationId: org.id, status: "open" }, include: { entries: { include: { member: true } } } });
  if (!period) return NextResponse.json({ error: "No pay period" }, { status: 404 });

  // Aggregate hours per member for the period
  const byMember = new Map<string, { hours: number; rate: number; externalId: string | null }>();
  for (const e of period.entries) {
    const cur = byMember.get(e.memberId) ?? { hours: 0, rate: e.member.hourlyRate ?? 0, externalId: e.member.externalEmployeeId };
    cur.hours += e.hours;
    byMember.set(e.memberId, cur);
  }

  let pushed = 0; let skipped = 0; const errors: string[] = [];
  for (const [memberId, agg] of byMember) {
    if (!agg.externalId) { skipped++; continue; }
    try {
      const gross = agg.hours * agg.rate;
      await FinchAPI.createPayStatement(org.finchAccessToken, {
        individual_id: agg.externalId,
        type: "regular_payroll",
        total_hours: agg.hours,
        gross_pay: { amount: Math.round(gross * 100), currency: "usd" },
        earnings: [{ type: "salary", amount: Math.round(gross * 100), currency: "usd", hours: agg.hours }],
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
