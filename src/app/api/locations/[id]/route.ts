import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name:                 z.string().min(2).max(80).optional(),
  weeklyBudget:         z.number().min(0).max(10_000_000).nullable().optional(),
  projectedRevenue:     z.number().min(0).max(100_000_000).nullable().optional(),
  latitude:             z.number().min(-90).max(90).nullable().optional(),
  longitude:            z.number().min(-180).max(180).nullable().optional(),
  geofenceRadiusMeters: z.number().int().min(10).max(50_000).optional(),
  clientId:             z.string().nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Defense: must belong to this org
  const existing = await prisma.location.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  // If a clientId is being set, verify the client belongs to this org
  if (parsed.data.clientId) {
    const client = await prisma.clientAccount.findFirst({
      where: { id: parsed.data.clientId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found in this org" }, { status: 404 });
  }

  try {
    // Dual-write the legacy Float money columns and their cents twins.
    const data: any = { ...parsed.data };
    if (parsed.data.weeklyBudget !== undefined) {
      data.weeklyBudgetCents = parsed.data.weeklyBudget == null ? null : Math.round(parsed.data.weeklyBudget * 100);
    }
    if (parsed.data.projectedRevenue !== undefined) {
      data.projectedRevenueCents = parsed.data.projectedRevenue == null ? null : Math.round(parsed.data.projectedRevenue * 100);
    }
    const r = await prisma.location.update({ where: { id }, data });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "org.update", entityType: "Location", entityId: id,
      metadata: parsed.data,
    });
    return NextResponse.json(r);
  } catch (e) {
    console.error("[locations] update failed", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;

  const existing = await prisma.location.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Block deletes when shifts still reference this location — keeps audit + payroll honest.
  const shiftCount = await prisma.shift.count({ where: { locationId: id } });
  if (shiftCount > 0) {
    return NextResponse.json({ error: `Cannot delete — ${shiftCount} shifts still reference this location. Reassign or archive them first.` }, { status: 409 });
  }

  try {
    await prisma.location.delete({ where: { id } });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "org.update", entityType: "Location", entityId: id,
      metadata: { deleted: existing.name },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[locations] delete failed", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
