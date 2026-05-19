import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  instructorMemberId: z.string().min(1).optional(),
  startsAt:           z.string().datetime().optional(),
  endsAt:             z.string().datetime().optional(),
  room:               z.string().max(80).nullable().optional(),
  status:             z.enum(["scheduled", "done", "cancelled"]).optional(),
  attendees:          z.number().int().min(0).max(500).optional(),
  notes:              z.string().max(500).nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.classOccurrence.findFirst({
    where: { id, fitnessClass: { organizationId: u.organizationId } }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = { ...parsed.data };
  if (data.startsAt) data.startsAt = new Date(data.startsAt);
  if (data.endsAt)   data.endsAt   = new Date(data.endsAt);

  const updated = await prisma.classOccurrence.update({ where: { id }, data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "ClassOccurrence", entityId: id, metadata: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.classOccurrence.findFirst({
    where: { id, fitnessClass: { organizationId: u.organizationId } }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.classOccurrence.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.delete", entityType: "ClassOccurrence", entityId: id });
  return NextResponse.json({ ok: true });
}
