import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const offer = await prisma.networkShiftOffer.findFirst({ where: { id, postingOrgId: u.organizationId } });
  if (!offer) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (offer.status === "claimed") return NextResponse.json({ error: "already claimed — cannot withdraw" }, { status: 400 });
  await prisma.networkShiftOffer.update({
    where: { id },
    data: { status: "canceled", closedAt: new Date() },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "network.cancel", entityType: "NetworkShiftOffer", entityId: id,
  });
  return NextResponse.json({ ok: true });
}
