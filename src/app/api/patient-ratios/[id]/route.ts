import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  patientCount: z.number().int().min(1).max(100).optional(),
  staffCount:   z.number().int().min(1).max(20).optional(),
  active:       z.boolean().optional(),
  notes:        z.string().max(500).nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.patientRatioRule.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.patientRatioRule.update({ where: { id }, data: parsed.data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.settings_update", entityType: "PatientRatioRule", entityId: id,
    metadata: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.patientRatioRule.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, unit: true, role: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.patientRatioRule.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.settings_update", entityType: "PatientRatioRule", entityId: id,
    metadata: { deleted: `${existing.role}/${existing.unit}` },
  });
  return NextResponse.json({ ok: true });
}
