// Public booking endpoint — no auth required. Parents POST a booking
// using a teacher's member ID. Conflict-detected via the unique
// constraint on slotId.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  slotId:      z.string().min(1),
  parentName:  z.string().min(1).max(120),
  studentName: z.string().min(1).max(120),
  parentEmail: z.string().email().nullable().optional(),
  parentPhone: z.string().max(20).nullable().optional(),
  notes:       z.string().max(500).nullable().optional(),
}).strict();

// Naive in-memory rate limit by IP. For real deployments swap for
// upstash/redis but this stops obvious abuse.
const recent = new Map<string, number[]>();
function ratelimit(ip: string, max = 5, windowMs = 60_000): boolean {
  const arr = recent.get(ip) ?? [];
  const cutoff = Date.now() - windowMs;
  const recentHits = arr.filter(t => t > cutoff);
  if (recentHits.length >= max) return false;
  recentHits.push(Date.now());
  recent.set(ip, recentHits);
  return true;
}

export async function POST(req: Request, { params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!ratelimit(ip)) return NextResponse.json({ error: "Too many requests — try again in a minute" }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Validate the teacher exists and is active
  const teacher = await prisma.member.findUnique({
    where: { id: teacherId },
    select: { id: true, status: true, organizationId: true },
  });
  if (!teacher || teacher.status !== "active") {
    return NextResponse.json({ error: "Teacher not available for bookings" }, { status: 404 });
  }

  // Validate the slot belongs to THIS teacher (prevents booking other teachers' slots by guessing slotIds)
  const slot = await prisma.conferenceSlot.findFirst({
    where: { id: parsed.data.slotId, teacherMemberId: teacherId, organizationId: teacher.organizationId },
    include: { bookings: true },
  });
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  if (slot.bookings.length > 0) return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
  if (slot.startsAt < new Date()) return NextResponse.json({ error: "Slot has already passed" }, { status: 400 });

  try {
    await prisma.conferenceBooking.create({
      data: {
        slotId: parsed.data.slotId,
        parentName: parsed.data.parentName,
        studentName: parsed.data.studentName,
        parentEmail: parsed.data.parentEmail ?? null,
        parentPhone: parsed.data.parentPhone ?? null,
        notes: parsed.data.notes ?? null,
        // bookedById left null — this is a public booking
      },
    });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
    throw e;
  }

  return NextResponse.json({ ok: true });
}
