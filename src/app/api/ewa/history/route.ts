import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { featureGuard } from "@/lib/feature-guard";

// GET /api/ewa/history?scope=mine|org
export async function GET(req: Request) {
  const u = await requireUser();
  const denied = await featureGuard(u.organizationId, "earned_wage_access");
  if (denied) return denied;
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "mine";
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const where: any = scope === "org" && isManager
    ? { organizationId: u.organizationId }
    : { memberId: u.memberId, organizationId: u.organizationId };

  const items = await prisma.ewaWithdrawal.findMany({
    where, orderBy: { requestedAt: "desc" }, take: 100,
    include: { member: { include: { user: true } } },
  });
  return NextResponse.json({
    items: items.map((w) => ({
      id: w.id,
      memberId: w.memberId,
      memberName: w.member.user.name,
      amountCents: w.amountCents,
      feeCentsCharged: w.feeCentsCharged,
      status: w.status,
      payoutMethod: w.payoutMethod,
      requestedAt: w.requestedAt,
      settledAt: w.settledAt,
      externalRef: w.externalRef,
      failureReason: w.failureReason,
    })),
  });
}
