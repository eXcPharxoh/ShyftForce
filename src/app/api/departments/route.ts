// Department zones (grocery/retail). Stores partition staff & shifts by
// section (Produce, Deli, Cashier, Apparel, etc.). Used for coverage maps
// and per-department labor reporting.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:       z.string().min(2).max(80),
  color:      z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  locationId: z.string().nullable().optional(),
  notes:      z.string().max(500).nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.department.findMany({
    where: { organizationId: u.organizationId },
    include: {
      location: { select: { name: true } },
      _count: { select: { memberships: true, shifts: { where: { startsAt: { gte: new Date() } } } } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({
    items: items.map(d => ({
      id: d.id, name: d.name, color: d.color,
      locationId: d.locationId, locationName: d.location?.name ?? null,
      notes: d.notes, active: d.active,
      memberCount: d._count.memberships,
      upcomingShifts: d._count.shifts,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: parsed.data.locationId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });
  }

  const d = await prisma.department.create({
    data: {
      organizationId: u.organizationId,
      name:           parsed.data.name,
      color:          parsed.data.color ?? "#6366f1",
      locationId:     parsed.data.locationId ?? null,
      notes:          parsed.data.notes ?? null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Department", entityId: d.id,
    metadata: { name: d.name },
  });
  return NextResponse.json({ ok: true, department: d });
}
