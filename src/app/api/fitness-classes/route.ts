// Group fitness classes (templates).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:         z.string().min(1).max(80),
  durationMins: z.number().int().min(15).max(240).default(60),
  capacity:     z.number().int().min(1).max(500).default(20),
  color:        z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description:  z.string().max(500).nullable().optional(),
  locationId:   z.string().nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.fitnessClass.findMany({
    where: { organizationId: u.organizationId, active: true },
    include: { _count: { select: { occurrences: { where: { startsAt: { gte: new Date() } } } } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    items: items.map(c => ({
      id: c.id, name: c.name, durationMins: c.durationMins,
      capacity: c.capacity, color: c.color, description: c.description,
      upcomingOccurrences: c._count.occurrences,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const c = await prisma.fitnessClass.create({
    data: {
      organizationId: u.organizationId,
      name: parsed.data.name,
      durationMins: parsed.data.durationMins,
      capacity: parsed.data.capacity,
      color: parsed.data.color ?? "#10b981",
      description: parsed.data.description ?? null,
      locationId: parsed.data.locationId ?? null,
    },
  });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "FitnessClass", entityId: c.id, metadata: { name: c.name } });
  return NextResponse.json({ ok: true, fitnessClass: c });
}
