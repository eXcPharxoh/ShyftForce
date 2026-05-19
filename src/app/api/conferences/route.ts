// Parent-teacher conference slots + bookings.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSlotSchema = z.object({
  teacherMemberId: z.string().min(1),
  startsAt:        z.string().datetime(),
  endsAt:          z.string().datetime(),
  notes:           z.string().max(500).nullable().optional(),
}).strict();

const BookSchema = z.object({
  slotId:      z.string().min(1),
  parentName:  z.string().min(1).max(120),
  studentName: z.string().min(1).max(120),
  parentEmail: z.string().email().nullable().optional(),
  parentPhone: z.string().max(20).nullable().optional(),
  notes:       z.string().max(500).nullable().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const teacherId = url.searchParams.get("teacherId");

  const where: any = { organizationId: u.organizationId, startsAt: { gte: new Date() } };
  if (teacherId) where.teacherMemberId = teacherId;
  if (u.role === "EMPLOYEE" && !teacherId) where.teacherMemberId = u.memberId ?? "";

  const items = await prisma.conferenceSlot.findMany({
    where,
    include: { bookings: true },
    orderBy: { startsAt: "asc" },
    take: 200,
  });
  return NextResponse.json({
    items: items.map(s => ({
      id: s.id, teacherId: s.teacherMemberId,
      startsAt: s.startsAt, endsAt: s.endsAt, notes: s.notes,
      booking: s.bookings[0] ? {
        parentName: s.bookings[0].parentName,
        studentName: s.bookings[0].studentName,
        parentEmail: s.bookings[0].parentEmail,
        parentPhone: s.bookings[0].parentPhone,
        notes: s.bookings[0].notes,
      } : null,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = CreateSlotSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (u.role === "EMPLOYEE" && parsed.data.teacherMemberId !== u.memberId) {
    return NextResponse.json({ error: "Teachers can only create their own slots" }, { status: 403 });
  }

  const teacher = await prisma.member.findFirst({
    where: { id: parsed.data.teacherMemberId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher not in org" }, { status: 404 });

  const s = await prisma.conferenceSlot.create({
    data: {
      organizationId: u.organizationId,
      teacherMemberId: parsed.data.teacherMemberId,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      notes: parsed.data.notes ?? null,
    },
  });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.create", entityType: "ConferenceSlot", entityId: s.id });
  return NextResponse.json({ ok: true, slot: s });
}

export async function PATCH(req: Request) {
  const u = await requireUser();
  const parsed = BookSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const slot = await prisma.conferenceSlot.findFirst({
    where: { id: parsed.data.slotId, organizationId: u.organizationId },
    include: { bookings: true },
  });
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  if (slot.bookings.length > 0) return NextResponse.json({ error: "Slot already booked" }, { status: 409 });

  try {
    const b = await prisma.conferenceBooking.create({
      data: {
        slotId: parsed.data.slotId,
        parentName: parsed.data.parentName,
        studentName: parsed.data.studentName,
        parentEmail: parsed.data.parentEmail ?? null,
        parentPhone: parsed.data.parentPhone ?? null,
        notes: parsed.data.notes ?? null,
        bookedById: u.memberId ?? null,
      },
    });
    await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.create", entityType: "ConferenceBooking", entityId: b.id });
    return NextResponse.json({ ok: true, booking: b });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
    throw e;
  }
}
