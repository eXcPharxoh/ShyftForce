import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const c = await prisma.posConnection.findFirst({ where: { id, organizationId: u.organizationId } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.posConnection.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "pos.disconnect", entityType: "PosConnection", entityId: id,
  });
  return NextResponse.json({ ok: true });
}
