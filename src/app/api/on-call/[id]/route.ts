// Update an on-call shift — usually to log called-in hours after the fact.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  calledInHours:             z.number().min(0).max(48).nullable().optional(),
  calledInPremiumMultiplier: z.number().min(1).max(5).nullable().optional(),
  stipendCents:              z.number().int().min(0).max(10_000_00).optional(),
  notes:                     z.string().max(500).nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.onCallShift.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.onCallShift.update({ where: { id }, data: parsed.data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "OnCallShift", entityId: id, metadata: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.onCallShift.findFirst({ where: { id, organizationId: u.organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.onCallShift.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.delete", entityType: "OnCallShift", entityId: id });
  return NextResponse.json({ ok: true });
}
