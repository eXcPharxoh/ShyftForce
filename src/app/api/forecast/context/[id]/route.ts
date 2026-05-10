import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const c = await prisma.demandContext.findFirst({ where: { id, organizationId: u.organizationId } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.demandContext.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "forecast.context_delete", entityType: "DemandContext", entityId: id,
  });
  return NextResponse.json({ ok: true });
}
