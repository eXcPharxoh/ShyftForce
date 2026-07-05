import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { featureGuard } from "@/lib/feature-guard";
import { getEwaBalance } from "@/lib/ewa/calc";
import { getProviderForOrg } from "@/lib/ewa/provider";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  amountCents: z.number().int().positive(),
  payoutMethod: z.enum(["ach", "instant_debit", "demo"]).optional().default("demo"),
});

export async function POST(req: Request) {
  const u = await requireUser();
  const denied = await featureGuard(u.organizationId, "earned_wage_access");
  if (denied) return denied;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const bal = await getEwaBalance({ memberId: u.memberId, organizationId: u.organizationId });
  if (!bal.enabled) return NextResponse.json({ error: "EWA not enabled by your employer" }, { status: 403 });
  if (parsed.data.amountCents > bal.availableCents) {
    return NextResponse.json({ error: `Requested $${(parsed.data.amountCents/100).toFixed(2)} exceeds available $${(bal.availableCents/100).toFixed(2)}` }, { status: 400 });
  }
  if (parsed.data.amountCents < bal.minWithdrawalCents) {
    return NextResponse.json({ error: `Minimum withdrawal is $${(bal.minWithdrawalCents/100).toFixed(2)}` }, { status: 400 });
  }

  const provider = await getProviderForOrg(u.organizationId);

  // 1) Create the row, then RE-VERIFY the period total inside the same
  //    serializable transaction. The availableCents check above is a
  //    read-then-write (TOCTOU): two near-simultaneous withdrawals each read
  //    the balance before either row exists and both pass, over-drawing past
  //    the cap. Re-summing inside a Serializable tx (and rolling back if the
  //    new total exceeds the period ceiling) makes the check-and-insert atomic.
  const ceilingCents = Math.min(bal.accessibleCents, bal.capCents);
  const periodStart = bal.payPeriodStartsOn ?? new Date(Date.now() - 14 * 86400_000);
  class EwaCapError extends Error {}
  let w;
  try {
    w = await prisma.$transaction(async (tx) => {
      const created = await tx.ewaWithdrawal.create({
        data: {
          memberId: u.memberId,
          organizationId: u.organizationId,
          amountCents: parsed.data.amountCents,
          feeCentsCharged: bal.feeCentsPerWithdrawal,
          payoutMethod: parsed.data.payoutMethod,
          payPeriodId: bal.payPeriodId,
          status: "pending",
        },
      });
      const agg = await tx.ewaWithdrawal.aggregate({
        where: {
          memberId: u.memberId,
          organizationId: u.organizationId,
          requestedAt: { gte: periodStart },
          status: { in: ["pending", "processing", "settled"] },
        },
        _sum: { amountCents: true },
      });
      if ((agg._sum.amountCents ?? 0) > ceilingCents) throw new EwaCapError();
      return created;
    }, { isolationLevel: "Serializable" });
  } catch (e: any) {
    // Cap exceeded, or a concurrent withdrawal forced a serialization failure
    // (Prisma P2034 / Postgres 40001). Either way: another request beat us to
    // the balance — ask the employee to refresh.
    if (e instanceof EwaCapError || e?.code === "P2034") {
      return NextResponse.json(
        { error: "That would exceed your available balance for this pay period. Refresh and try again." },
        { status: 409 },
      );
    }
    throw e;
  }
  // 2) Hand off to provider
  let result;
  try {
    result = await provider.initiate({
      withdrawalId: w.id,
      organizationId: u.organizationId,
      memberId: u.memberId,
      amountCents: parsed.data.amountCents,
      feeCentsCharged: bal.feeCentsPerWithdrawal,
      payoutMethod: parsed.data.payoutMethod,
    });
  } catch (e: any) {
    result = { ok: false, newStatus: "failed" as const, failureReason: e.message ?? String(e) };
  }
  // 3) Update with provider response
  const updated = await prisma.ewaWithdrawal.update({
    where: { id: w.id },
    data: {
      status: result.newStatus,
      externalRef: result.externalRef ?? null,
      failureReason: result.failureReason ?? null,
      ...(result.newStatus === "settled" ? { settledAt: new Date() } : {}),
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "ewa.withdraw", entityType: "EwaWithdrawal", entityId: w.id,
    metadata: { amountCents: parsed.data.amountCents, status: result.newStatus, provider: provider.name },
  });

  return NextResponse.json({ ok: result.ok, withdrawal: updated, providerName: provider.name });
}
