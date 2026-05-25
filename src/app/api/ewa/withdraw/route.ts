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
  const parsed = Schema.safeParse(await req.json());
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
  // 1) Create the row first so we have an ID to pass to the provider
  const w = await prisma.ewaWithdrawal.create({
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
