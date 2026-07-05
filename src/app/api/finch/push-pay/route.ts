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
  // ONLY pull APPROVED timesheet entries. Unapproved / disputed hours must
  // never be paid: the confirm dialog explicitly promises "unapproved entries
  // will be skipped." Previously entries were loaded with no approved filter,
  // so a manager running payroll paid out real money on unverified time.
  const entriesInclude = { entries: { where: { approved: true }, include: { member: true } } };
  const period = payPeriodId
    ? await prisma.payPeriod.findFirst({
        where: { id: payPeriodId, organizationId: org.id },
        include: entriesInclude,
      })
    : await prisma.payPeriod.findFirst({
        where: { organizationId: org.id, status: "open" },
        include: entriesInclude,
      });
  if (!period) return NextResponse.json({ error: "No pay period" }, { status: 404 });

  // ---- Idempotency guard (prevents paying everyone TWICE) ----
  // Atomically CLAIM the period by flipping open -> paid before pushing. A
  // second POST (double-click past the client busy flag, a retry after a
  // partial-failure response, or any re-run) finds status != "open", so the
  // updateMany matches 0 rows and we refuse. Without this the endpoint was
  // freely re-callable and re-pushed a full second set of pay statements.
  const claim = await prisma.payPeriod.updateMany({
    where: { id: period.id, status: "open" },
    data: { status: "paid" },
  });
  if (claim.count === 0) {
    return NextResponse.json(
      { error: "This pay period has already been run. Payroll for it was pushed earlier — re-running is blocked so nobody gets paid twice." },
      { status: 409 },
    );
  }

  // Count how many entries we intentionally skipped because they weren't
  // approved, so the response can report it truthfully.
  const unapprovedSkipped = await prisma.timesheetEntry.count({
    where: { payPeriodId: period.id, approved: false },
  });

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

  // If literally nothing was pushed (every member skipped for a missing payroll
  // id, or every push errored), release the period back to "open" so a fixed
  // retry can run. If ANY push succeeded we keep it "paid" — re-running must
  // never re-pay the members who already went through.
  if (pushed === 0) {
    await prisma.payPeriod.updateMany({
      where: { id: period.id, status: "paid" },
      data: { status: "open" },
    });
  }

  await audit({
    organizationId: org.id, actorId: u.id,
    action: "billing.checkout", entityType: "Finch.payroll",
    metadata: { payPeriodId: period.id, pushed, skipped, unapprovedSkipped, errors: errors.length },
  });

  // `skipped` = members missing an external payroll id; `unapprovedSkipped`
  // = timesheet entries left out because they weren't approved.
  return NextResponse.json({ pushed, skipped, unapprovedSkipped, errors });
}
