// Specific class instances (Mon 6am Yoga). Each has its own instructor.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/utils";

const CreateSchema = z.object({
  fitnessClassId:     z.string().min(1),
  instructorMemberId: z.string().min(1),
  startsAt:           z.string().datetime(),
  endsAt:             z.string().datetime().optional(),
  room:               z.string().max(80).nullable().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") ?? "14");

  const items = await prisma.classOccurrence.findMany({
    where: {
      fitnessClass: { organizationId: u.organizationId },
      startsAt: { gte: new Date(), lt: addDays(new Date(), days) },
    },
    include: {
      fitnessClass: { select: { name: true, color: true, capacity: true } },
      instructor:   { include: { user: { select: { name: true } } } },
    },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    items: items.map(o => ({
      id: o.id, className: o.fitnessClass.name, color: o.fitnessClass.color, capacity: o.fitnessClass.capacity,
      instructorName: o.instructor.user.name, instructorId: o.instructorMemberId,
      startsAt: o.startsAt, endsAt: o.endsAt, room: o.room,
      status: o.status, attendees: o.attendees, notes: o.notes,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const [klass, instructor] = await Promise.all([
    prisma.fitnessClass.findFirst({
      where: { id: parsed.data.fitnessClassId, organizationId: u.organizationId, active: true },
      select: { id: true, name: true, durationMins: true },
    }),
    prisma.member.findFirst({
      where: { id: parsed.data.instructorMemberId, organizationId: u.organizationId, status: "active" },
      select: { id: true },
    }),
  ]);
  if (!klass)      return NextResponse.json({ error: "Class not active or not in org" }, { status: 404 });
  if (!instructor) return NextResponse.json({ error: "Instructor not in org" }, { status: 404 });

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt
    ? new Date(parsed.data.endsAt)
    : new Date(startsAt.getTime() + klass.durationMins * 60_000);

  const o = await prisma.classOccurrence.create({
    data: {
      fitnessClassId: parsed.data.fitnessClassId,
      instructorMemberId: parsed.data.instructorMemberId,
      startsAt, endsAt,
      room: parsed.data.room ?? null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "ClassOccurrence", entityId: o.id,
    metadata: { className: klass.name, startsAt: parsed.data.startsAt },
  });
  return NextResponse.json({ ok: true, occurrence: o });
}
