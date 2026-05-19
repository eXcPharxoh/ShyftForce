// Fleet vehicles CRUD. Each shift can be assigned a vehicle (1:1) via the
// VehicleAssignment record.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:         z.string().min(2).max(80),
  locationId:   z.string().nullable().optional(),
  licensePlate: z.string().max(20).nullable().optional(),
  vin:          z.string().max(20).nullable().optional(),
  make:         z.string().max(40).nullable().optional(),
  model:        z.string().max(40).nullable().optional(),
  year:         z.number().int().min(1950).max(2100).nullable().optional(),
  notes:        z.string().max(500).nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.vehicle.findMany({
    where: { organizationId: u.organizationId },
    include: {
      location: { select: { name: true } },
      assignments: {
        where: { shift: { startsAt: { gte: new Date() } } },
        include: { member: { include: { user: { select: { name: true } } } }, shift: { select: { startsAt: true, endsAt: true } } },
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    items: items.map(v => ({
      id: v.id, name: v.name, locationId: v.locationId, locationName: v.location?.name ?? null,
      licensePlate: v.licensePlate, vin: v.vin,
      make: v.make, model: v.model, year: v.year, status: v.status,
      notes: v.notes,
      upcomingAssignments: v.assignments.map(a => ({
        id: a.id, shiftId: a.shiftId, memberName: a.member.user.name,
        startsAt: a.shift.startsAt, endsAt: a.shift.endsAt,
      })),
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

  const v = await prisma.vehicle.create({
    data: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId ?? null,
      name:           parsed.data.name,
      licensePlate:   parsed.data.licensePlate ?? null,
      vin:            parsed.data.vin ?? null,
      make:           parsed.data.make ?? null,
      model:          parsed.data.model ?? null,
      year:           parsed.data.year ?? null,
      notes:          parsed.data.notes ?? null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Vehicle", entityId: v.id,
    metadata: { name: v.name },
  });
  return NextResponse.json({ ok: true, vehicle: v });
}
