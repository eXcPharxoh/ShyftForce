import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

// PATCH /api/shift-swaps/:id  body: { action: "accept_target" | "reject_target" | "approve" | "reject" | "cancel" }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const { action } = await req.json();

  const r = await prisma.shiftSwapRequest.findUnique({
    where: { id },
    include: { shift: { include: { location: true } } },
  });
  if (!r || r.shift.location.organizationId !== u.organizationId) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  let newStatus = r.status;
  switch (action) {
    case "accept_target":
      if (r.targetId !== u.memberId) return NextResponse.json({ error: "not the target" }, { status: 403 });
      if (r.status !== "pending")    return NextResponse.json({ error: "no longer pending" }, { status: 400 });
      newStatus = "accepted_by_target";
      break;
    case "reject_target":
      if (r.targetId !== u.memberId) return NextResponse.json({ error: "not the target" }, { status: 403 });
      if (r.status !== "pending")    return NextResponse.json({ error: "no longer pending" }, { status: 400 });
      newStatus = "rejected_by_target";
      break;
    case "approve":
      if (!isManager) return NextResponse.json({ error: "manager only" }, { status: 403 });
      if (r.status !== "accepted_by_target") return NextResponse.json({ error: "target hasn't accepted yet" }, { status: 400 });

      // Perform the swap atomically
      await prisma.$transaction(async (tx) => {
        await tx.shift.update({ where: { id: r.shiftId },     data: { memberId: r.targetId } });
        if (r.targetShiftId) {
          await tx.shift.update({ where: { id: r.targetShiftId }, data: { memberId: r.requesterId } });
        }
      });
      newStatus = "approved";
      break;
    case "reject":
      if (!isManager) return NextResponse.json({ error: "manager only" }, { status: 403 });
      newStatus = "rejected";
      break;
    case "cancel":
      if (r.requesterId !== u.memberId) return NextResponse.json({ error: "not the requester" }, { status: 403 });
      newStatus = "canceled";
      break;
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  const updated = await prisma.shiftSwapRequest.update({
    where: { id },
    data: { status: newStatus, decidedAt: new Date(), decidedById: u.id },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: action === "approve" ? "shift.update" : "shift.create",
    entityType: "ShiftSwapRequest", entityId: id, metadata: { action, status: newStatus },
  });

  return NextResponse.json(updated);
}
