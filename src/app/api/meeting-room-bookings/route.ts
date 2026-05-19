// Book a meeting room. Conflict detection enforced.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  meetingRoomId: z.string().min(1),
  startsAt:      z.string().datetime(),
  endsAt:        z.string().datetime(),
  title:         z.string().min(1).max(120),
  attendees:     z.array(z.string()).max(50).optional(),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  if (!u.memberId) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const room = await prisma.meetingRoom.findFirst({
    where: { id: parsed.data.meetingRoomId, organizationId: u.organizationId, active: true },
    select: { id: true, name: true },
  });
  if (!room) return NextResponse.json({ error: "Room not available" }, { status: 404 });

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt   = new Date(parsed.data.endsAt);
  if (endsAt <= startsAt) return NextResponse.json({ error: "End time must be after start" }, { status: 400 });

  // Conflict check
  const conflict = await prisma.meetingRoomBooking.findFirst({
    where: {
      meetingRoomId: parsed.data.meetingRoomId,
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
    include: { organizer: { include: { user: { select: { name: true } } } } },
  });
  if (conflict) {
    return NextResponse.json({
      error: `Conflicts with "${conflict.title}" by ${conflict.organizer.user.name}`,
      conflictId: conflict.id,
    }, { status: 409 });
  }

  const b = await prisma.meetingRoomBooking.create({
    data: {
      meetingRoomId: parsed.data.meetingRoomId,
      organizerId:   u.memberId,
      startsAt, endsAt,
      title: parsed.data.title,
      attendees: parsed.data.attendees ? JSON.stringify(parsed.data.attendees) : null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "MeetingRoomBooking", entityId: b.id,
    metadata: { roomName: room.name, title: parsed.data.title },
  });
  return NextResponse.json({ ok: true, booking: b });
}

const DeleteSchema = z.object({ id: z.string().min(1) }).strict();
export async function DELETE(req: Request) {
  const u = await requireUser();
  const parsed = DeleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const b = await prisma.meetingRoomBooking.findFirst({
    where: { id: parsed.data.id, room: { organizationId: u.organizationId } },
    select: { id: true, organizerId: true },
  });
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.role === "EMPLOYEE" && b.organizerId !== u.memberId) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }
  await prisma.meetingRoomBooking.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
