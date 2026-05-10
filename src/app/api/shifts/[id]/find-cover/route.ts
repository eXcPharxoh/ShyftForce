import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { openShiftForCover } from "@/lib/marketplace/autopilot";

// POST /api/shifts/:id/find-cover
// Manager one-tap: open this assigned shift + auto-fire Wave 1.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { location: true },
  });
  if (!shift || shift.location.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "shift not found" }, { status: 404 });
  }
  if (shift.endsAt < new Date()) {
    return NextResponse.json({ error: "shift already ended" }, { status: 400 });
  }

  const result = await openShiftForCover({
    shiftId: id,
    organizationId: u.organizationId,
    reason: "manager_open",
    triggeredByMemberId: u.memberId,
  });

  await audit({
    organizationId: u.organizationId,
    actorId: u.id,
    action: "shift.update",
    entityType: "Shift",
    entityId: id,
    metadata: { event: "find_cover", offersSent: result.offersSent },
  });

  return NextResponse.json({ ok: true, offersSent: result.offersSent });
}
