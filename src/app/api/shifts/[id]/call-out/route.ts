import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { openShiftForCover } from "@/lib/marketplace/autopilot";

// POST /api/shifts/:id/call-out
// Employee says "I can't make my shift" — releases it + fires Wave 1 cover offers.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { location: true },
  });
  if (!shift || shift.location.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "shift not found" }, { status: 404 });
  }
  if (shift.memberId !== u.memberId) {
    return NextResponse.json({ error: "you don't own this shift" }, { status: 403 });
  }
  if (shift.isOpen) {
    return NextResponse.json({ error: "shift is already open for cover" }, { status: 400 });
  }
  // Don't allow calling out for a shift that already ended
  if (shift.endsAt < new Date()) {
    return NextResponse.json({ error: "shift already ended" }, { status: 400 });
  }

  const result = await openShiftForCover({
    shiftId: id,
    organizationId: u.organizationId,
    reason: "called_out",
    triggeredByMemberId: u.memberId,
  });

  await audit({
    organizationId: u.organizationId,
    actorId: u.id,
    action: "shift.update",
    entityType: "Shift",
    entityId: id,
    metadata: { event: "call_out", offersSent: result.offersSent },
  });

  return NextResponse.json({ ok: true, offersSent: result.offersSent });
}
