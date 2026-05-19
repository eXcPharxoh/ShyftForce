import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const t = await prisma.checklistTemplate.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.checklistTemplate.update({ where: { id }, data: { active: false } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "ChecklistTemplate", entityId: id, metadata: { archived: t.name } });
  return NextResponse.json({ ok: true });
}
