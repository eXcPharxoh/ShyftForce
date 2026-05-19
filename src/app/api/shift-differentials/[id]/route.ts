import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name:         z.string().min(2).max(120).optional(),
  multiplier:   z.number().min(1).max(5).optional(),
  flatAddCents: z.number().int().min(0).max(100_00).nullable().optional(),
  active:       z.boolean().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.shiftDifferential.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.shiftDifferential.update({ where: { id }, data: parsed.data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.settings_update", entityType: "ShiftDifferential", entityId: id,
    metadata: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.shiftDifferential.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.shiftDifferential.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.settings_update", entityType: "ShiftDifferential", entityId: id,
    metadata: { deleted: existing.name },
  });
  return NextResponse.json({ ok: true });
}
