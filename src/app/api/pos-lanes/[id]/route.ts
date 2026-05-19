import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name:   z.string().max(80).nullable().optional(),
  type:   z.enum(["standard", "express", "self_checkout"]).optional(),
  active: z.boolean().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.posLane.findFirst({
    where: { id, organizationId: u.organizationId }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.posLane.update({ where: { id }, data: parsed.data });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "PosLane", entityId: id, metadata: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.posLane.findFirst({
    where: { id, organizationId: u.organizationId }, select: { id: true, number: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.posLane.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "PosLane", entityId: id, metadata: { deletedLane: existing.number } });
  return NextResponse.json({ ok: true });
}
