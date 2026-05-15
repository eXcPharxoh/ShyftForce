import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  title:    z.string().min(2).max(140).optional(),
  body:     z.string().min(2).max(8000).optional(),
  category: z.enum(["general", "schedule", "policy", "celebration", "alert"]).optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const existing = await prisma.billboardPost.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  const updated = await prisma.billboardPost.update({ where: { id }, data: parsed.data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "BillboardPost", entityId: id,
    metadata: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.billboardPost.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, title: true },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.billboardPost.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "BillboardPost", entityId: id,
    metadata: { deleted: existing.title },
  });
  return NextResponse.json({ ok: true });
}
