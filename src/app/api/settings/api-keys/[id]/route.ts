import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const k = await prisma.apiKey.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!k) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "ApiKey", entityId: id,
    metadata: { revoked: k.name },
  });
  return NextResponse.json({ ok: true });
}
