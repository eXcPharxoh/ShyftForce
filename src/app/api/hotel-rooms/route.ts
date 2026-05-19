// Hotel rooms + status tracking.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  number:  z.string().min(1).max(20),
  floor:   z.number().int().min(-5).max(200).nullable().optional(),
  type:    z.enum(["standard", "suite", "accessible", "family", "deluxe"]).default("standard"),
  notes:   z.string().max(500).nullable().optional(),
}).strict();

const StatusUpdateSchema = z.object({
  id:     z.string().min(1),
  status: z.enum(["clean", "dirty", "cleaning", "out_of_order"]),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.hotelRoom.findMany({
    where: { organizationId: u.organizationId },
    include: {
      assignments: {
        where: { completedAt: null },
        include: { member: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ floor: "asc" }, { number: "asc" }],
  });

  const byStatus: Record<string, number> = {};
  for (const r of items) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  return NextResponse.json({
    items: items.map(r => ({
      id: r.id, number: r.number, floor: r.floor, type: r.type, status: r.status, notes: r.notes,
      currentHousekeeper: r.assignments[0]?.member.user.name ?? null,
      assignmentStartedAt: r.assignments[0]?.startedAt ?? null,
    })),
    summary: byStatus,
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const r = await prisma.hotelRoom.create({
      data: {
        organizationId: u.organizationId,
        number: parsed.data.number,
        floor: parsed.data.floor ?? null,
        type: parsed.data.type,
        notes: parsed.data.notes ?? null,
      },
    });
    await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "HotelRoom", entityId: r.id, metadata: { number: r.number } });
    return NextResponse.json({ ok: true, room: r });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Room number already exists" }, { status: 409 });
    throw e;
  }
}

export async function PATCH(req: Request) {
  const u = await requireUser();
  const parsed = StatusUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.hotelRoom.findFirst({ where: { id: parsed.data.id, organizationId: u.organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.hotelRoom.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.update", entityType: "HotelRoom", entityId: parsed.data.id, metadata: { status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
