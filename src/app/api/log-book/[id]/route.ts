import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  category:         z.enum(["recap", "incident", "vip", "maintenance", "inventory", "safety", "other"]).optional(),
  title:            z.string().max(120).nullable().optional(),
  body:             z.string().min(1).max(8000).optional(),
  followUpRequired: z.boolean().optional(),
  resolved:         z.boolean().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.shiftLogEntry.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  if (parsed.data.category   !== undefined) data.category = parsed.data.category;
  if (parsed.data.title      !== undefined) data.title    = parsed.data.title;
  if (parsed.data.body       !== undefined) data.body     = parsed.data.body;
  if (parsed.data.followUpRequired !== undefined) data.followUpRequired = parsed.data.followUpRequired;
  if (parsed.data.resolved === true)  { data.resolvedAt = new Date(); data.resolvedById = u.memberId ?? null; }
  if (parsed.data.resolved === false) { data.resolvedAt = null;       data.resolvedById = null; }

  await prisma.shiftLogEntry.update({ where: { id }, data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "ShiftLogEntry", entityId: id, metadata: parsed.data,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.shiftLogEntry.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.shiftLogEntry.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.delete", entityType: "ShiftLogEntry", entityId: id });
  return NextResponse.json({ ok: true });
}
