import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const p = await prisma.checkpointPost.findFirst({ where: { id, organizationId: u.organizationId } });
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Soft delete — keep scans for audit
  await prisma.checkpointPost.update({ where: { id }, data: { active: false } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "checkpoint.deactivate", entityType: "CheckpointPost", entityId: id,
  });
  return NextResponse.json({ ok: true });
}
