// Assign a housekeeper to a room (one open assignment per room at a time).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  hotelRoomId: z.string().min(1),
  memberId:    z.string().min(1),
  shiftId:     z.string().nullable().optional(),
}).strict();

const CompleteSchema = z.object({ id: z.string().min(1) }).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  if (u.role === "EMPLOYEE") return NextResponse.json({ error: "Only managers can assign rooms" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [room, member] = await Promise.all([
    prisma.hotelRoom.findFirst({ where: { id: parsed.data.hotelRoomId, organizationId: u.organizationId }, select: { id: true } }),
    prisma.member.findFirst({ where: { id: parsed.data.memberId, organizationId: u.organizationId }, select: { id: true } }),
  ]);
  if (!room) return NextResponse.json({ error: "Room not in org" }, { status: 404 });
  if (!member) return NextResponse.json({ error: "Member not in org" }, { status: 404 });

  const a = await prisma.hotelRoomAssignment.create({
    data: {
      hotelRoomId: parsed.data.hotelRoomId,
      memberId: parsed.data.memberId,
      shiftId: parsed.data.shiftId ?? null,
      startedAt: new Date(),
    },
  });
  await prisma.hotelRoom.update({ where: { id: parsed.data.hotelRoomId }, data: { status: "cleaning" } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "HotelRoomAssignment", entityId: a.id,
    metadata: { roomId: parsed.data.hotelRoomId, memberId: parsed.data.memberId },
  });
  return NextResponse.json({ ok: true, assignment: a });
}

// Mark room cleaning complete
export async function PATCH(req: Request) {
  const u = await requireUser();
  if (!u.memberId) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  const parsed = CompleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const a = await prisma.hotelRoomAssignment.findFirst({
    where: { id: parsed.data.id, hotelRoom: { organizationId: u.organizationId } },
    select: { id: true, memberId: true, hotelRoomId: true },
  });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.role === "EMPLOYEE" && a.memberId !== u.memberId) {
    return NextResponse.json({ error: "Not your assignment" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.hotelRoomAssignment.update({ where: { id: a.id }, data: { completedAt: new Date() } }),
    prisma.hotelRoom.update({ where: { id: a.hotelRoomId }, data: { status: "clean" } }),
  ]);
  return NextResponse.json({ ok: true });
}
