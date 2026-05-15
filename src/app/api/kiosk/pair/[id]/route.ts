// Revoke a paired kiosk device. The device's token immediately stops working.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const device = await prisma.kioskDevice.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.kioskDevice.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "KioskDevice", entityId: id,
    metadata: { revoked: device.name },
  });
  return NextResponse.json({ ok: true });
}
