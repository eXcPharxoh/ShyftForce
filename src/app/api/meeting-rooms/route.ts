// Meeting rooms + bookings.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:          z.string().min(1).max(80),
  capacity:      z.number().int().min(1).max(500).default(4),
  hasVideo:      z.boolean().default(true),
  hasWhiteboard: z.boolean().default(false),
  notes:         z.string().max(500).nullable().optional(),
  locationId:    z.string().nullable().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const date = url.searchParams.get("date"); // YYYY-MM-DD

  const items = await prisma.meetingRoom.findMany({
    where: { organizationId: u.organizationId, active: true },
    include: date ? {
      bookings: {
        where: {
          startsAt: { gte: new Date(date + "T00:00:00Z"), lt: new Date(date + "T23:59:59Z") },
        },
        include: { organizer: { include: { user: { select: { name: true } } } } },
        orderBy: { startsAt: "asc" },
      },
    } : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    items: items.map(r => ({
      id: r.id, name: r.name, capacity: r.capacity,
      hasVideo: r.hasVideo, hasWhiteboard: r.hasWhiteboard, notes: r.notes,
      bookings: date ? (r as any).bookings?.map((b: any) => ({
        id: b.id, title: b.title,
        startsAt: b.startsAt, endsAt: b.endsAt,
        organizerName: b.organizer.user.name, organizerId: b.organizerId,
      })) ?? [] : undefined,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const r = await prisma.meetingRoom.create({
    data: {
      organizationId: u.organizationId,
      name: parsed.data.name, capacity: parsed.data.capacity,
      hasVideo: parsed.data.hasVideo, hasWhiteboard: parsed.data.hasWhiteboard,
      notes: parsed.data.notes ?? null,
      locationId: parsed.data.locationId ?? null,
    },
  });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "MeetingRoom", entityId: r.id, metadata: { name: r.name } });
  return NextResponse.json({ ok: true, room: r });
}
