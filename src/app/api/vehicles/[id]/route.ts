import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name:         z.string().min(2).max(80).optional(),
  status:       z.enum(["active", "maintenance", "retired"]).optional(),
  notes:        z.string().max(500).nullable().optional(),
  licensePlate: z.string().max(20).nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.vehicle.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.vehicle.update({ where: { id }, data: parsed.data });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "Vehicle", entityId: id, metadata: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.vehicle.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.vehicle.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "Vehicle", entityId: id, metadata: { deleted: existing.name } });
  return NextResponse.json({ ok: true });
}
