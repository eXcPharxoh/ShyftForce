// Client account CRUD for tenant managers. Without this they could create
// clients but never update bill rate, deactivate them, or change contact info.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name:               z.string().min(1).max(200).optional(),
  contactName:        z.string().max(120).nullable().optional(),
  contactEmail:       z.string().email().nullable().optional(),
  contactPhone:       z.string().max(40).nullable().optional(),
  billRateCents:      z.number().int().nonnegative().optional(),
  overtimeMultiplier: z.number().min(1).max(3).optional(),
  invoiceTerms:       z.enum(["net_15", "net_30", "net_60", "due_on_receipt"]).optional(),
  active:             z.boolean().optional(),
  notes:              z.string().max(2000).nullable().optional(),
  locationIds:        z.array(z.string()).optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.clientAccount.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, active: true },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Verify any new location assignments are in-org
  if (parsed.data.locationIds && parsed.data.locationIds.length > 0) {
    const found = await prisma.location.findMany({
      where: { id: { in: parsed.data.locationIds }, organizationId: u.organizationId },
      select: { id: true },
    });
    if (found.length !== parsed.data.locationIds.length) {
      return NextResponse.json({ error: "one or more locations not in org" }, { status: 400 });
    }
  }

  const { locationIds, ...patch } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.clientAccount.update({ where: { id }, data: patch });
      if (locationIds) {
        // Clear any locations currently attached but not in the new set, then attach the new set.
        await tx.location.updateMany({
          where: { organizationId: u.organizationId, clientId: id, id: { notIn: locationIds } },
          data: { clientId: null },
        });
        if (locationIds.length > 0) {
          await tx.location.updateMany({
            where: { id: { in: locationIds }, organizationId: u.organizationId },
            data: { clientId: id },
          });
        }
      }
      return r;
    });

    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: parsed.data.active === false && existing.active ? "client.deactivate" : "client.update",
      entityType: "ClientAccount", entityId: id,
      metadata: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[clients/:id] update failed", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;

  const existing = await prisma.clientAccount.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Soft-deactivate to preserve historical billing — never hard-delete.
  await prisma.$transaction(async (tx) => {
    // Unlink locations from this client first
    await tx.location.updateMany({ where: { clientId: id, organizationId: u.organizationId }, data: { clientId: null } });
    await tx.clientAccount.update({ where: { id }, data: { active: false } });
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "client.deactivate", entityType: "ClientAccount", entityId: id,
    metadata: { name: existing.name },
  });
  return NextResponse.json({ ok: true });
}
