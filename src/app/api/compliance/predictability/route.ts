import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { unresolvedPredictabilityForOrg } from "@/lib/compliance/predictability";
import { audit } from "@/lib/audit";

// GET /api/compliance/predictability → unresolved ledger
export async function GET() {
  const u = await requireUser();
  const summary = await unresolvedPredictabilityForOrg(u.organizationId);
  return NextResponse.json({
    totalOwedCents: summary.totalOwedCents,
    byMember: summary.byMember,
    events: summary.events.map((e) => ({
      id: e.id,
      memberId: e.memberId,
      memberName: e.member.user.name,
      shiftId: e.shiftId,
      locationName: e.shift.location.name,
      changeType: e.changeType,
      occurredAt: e.occurredAt,
      shiftStartsAt: e.shiftStartsAt,
      noticeHours: e.noticeHours,
      hoursOwed: e.hoursOwed,
      hourlyRate: e.hourlyRate,
      amountOwedCents: e.amountOwedCents,
      reason: e.reason,
    })),
  });
}

// PATCH /api/compliance/predictability  body { eventIds: string[], action: "resolve" | "unresolve" }
export async function PATCH(req: Request) {
  const u = await requireManagerOrAdmin();
  const { eventIds, action } = await req.json();
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return NextResponse.json({ error: "eventIds required" }, { status: 400 });
  }
  // Verify ownership
  const found = await prisma.predictabilityPayEvent.findMany({
    where: { id: { in: eventIds }, organizationId: u.organizationId },
    select: { id: true },
  });
  if (found.length === 0) return NextResponse.json({ error: "no matching events" }, { status: 404 });

  const data = action === "resolve"
    ? { resolvedAt: new Date(), resolvedById: u.id }
    : { resolvedAt: null, resolvedById: null };
  const result = await prisma.predictabilityPayEvent.updateMany({
    where: { id: { in: found.map((f) => f.id) } },
    data,
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.update", entityType: "PredictabilityPayEvent",
    metadata: { count: result.count, action },
  });
  return NextResponse.json({ updated: result.count });
}
