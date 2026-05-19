// Cashier lanes (grocery front-end). Pre-assigned during peak so the
// line never builds up.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  locationId: z.string().min(1),
  number:     z.number().int().min(1).max(999),
  name:       z.string().max(80).nullable().optional(),
  type:       z.enum(["standard", "express", "self_checkout"]).default("standard"),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId");
  const where: any = { organizationId: u.organizationId };
  if (locationId) where.locationId = locationId;

  const items = await prisma.posLane.findMany({
    where,
    include: {
      location: { select: { name: true } },
      assignments: {
        where: { shift: { startsAt: { gte: new Date(), lt: new Date(Date.now() + 86_400_000) } } },
        include: { member: { include: { user: { select: { name: true } } } }, shift: { select: { startsAt: true, endsAt: true } } },
      },
    },
    orderBy: [{ locationId: "asc" }, { number: "asc" }],
  });
  return NextResponse.json({
    items: items.map(l => ({
      id: l.id, number: l.number, name: l.name, type: l.type, active: l.active,
      locationId: l.locationId, locationName: l.location.name,
      todayAssignments: l.assignments.map(a => ({
        shiftId: a.shiftId, memberName: a.member.user.name,
        startsAt: a.shift.startsAt, endsAt: a.shift.endsAt,
      })),
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const loc = await prisma.location.findFirst({
    where: { id: parsed.data.locationId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });

  try {
    const lane = await prisma.posLane.create({
      data: {
        organizationId: u.organizationId,
        locationId:     parsed.data.locationId,
        number:         parsed.data.number,
        name:           parsed.data.name ?? null,
        type:           parsed.data.type,
      },
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "org.update", entityType: "PosLane", entityId: lane.id,
      metadata: { number: lane.number, type: lane.type },
    });
    return NextResponse.json({ ok: true, lane });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Lane number already exists at this location" }, { status: 409 });
    throw e;
  }
}
