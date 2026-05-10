import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { addDays, startOfWeek } from "@/lib/utils";
import { audit } from "@/lib/audit";

// POST /api/schedule/copy-week
// body: { fromWeekStart?: ISO, toWeekStart?: ISO, publish?: boolean, includeOpenShifts?: boolean }
// Defaults: from = last week, to = this week
export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const body = await req.json().catch(() => ({}));

  const thisMonday = startOfWeek(new Date());
  const lastMonday = addDays(thisMonday, -7);
  const fromStart  = body.fromWeekStart ? new Date(body.fromWeekStart) : lastMonday;
  const toStart    = body.toWeekStart   ? new Date(body.toWeekStart)   : thisMonday;
  fromStart.setHours(0,0,0,0); toStart.setHours(0,0,0,0);
  const fromEnd    = addDays(fromStart, 7);
  const toEnd      = addDays(toStart, 7);

  const offsetMs = +toStart - +fromStart;
  const publish  = !!body.publish;
  const includeOpen = body.includeOpenShifts !== false;

  const sourceShifts = await prisma.shift.findMany({
    where: { location: { organizationId: u.organizationId }, startsAt: { gte: fromStart, lt: fromEnd } },
  });
  const targetExisting = await prisma.shift.findMany({
    where: { location: { organizationId: u.organizationId }, startsAt: { gte: toStart, lt: toEnd } },
    select: { memberId: true, startsAt: true, endsAt: true, locationId: true },
  });
  const overlap = (s: { memberId: string | null; startsAt: Date; endsAt: Date; locationId: string }) =>
    targetExisting.some(t =>
      t.locationId === s.locationId &&
      t.memberId === s.memberId &&
      t.startsAt < s.endsAt &&
      t.endsAt > s.startsAt,
    );

  const offs = await prisma.timeOffRequest.findMany({
    where: { member: { organizationId: u.organizationId }, status: "approved", startsOn: { lte: toEnd }, endsOn: { gte: toStart } },
    select: { memberId: true, startsOn: true, endsOn: true },
  });
  const onTimeOff = (memberId: string | null, when: Date) =>
    !!memberId && offs.some(o => o.memberId === memberId && o.startsOn <= when && o.endsOn >= when);

  let created = 0; let skipped = 0;
  for (const s of sourceShifts) {
    if (!includeOpen && s.isOpen) { skipped++; continue; }
    const newStart = new Date(+s.startsAt + offsetMs);
    const newEnd   = new Date(+s.endsAt   + offsetMs);
    const candidate = { memberId: s.memberId, startsAt: newStart, endsAt: newEnd, locationId: s.locationId };
    if (overlap(candidate)) { skipped++; continue; }
    if (onTimeOff(s.memberId, newStart)) { skipped++; continue; }

    await prisma.shift.create({
      data: {
        memberId:   s.memberId,
        locationId: s.locationId,
        startsAt: newStart,
        endsAt:   newEnd,
        position: s.position,
        notes:    s.notes,
        isOpen:   s.isOpen,
        status:   publish ? "published" : "draft",
      },
    });
    created++;
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "Schedule.copyWeek",
    metadata: { fromStart: fromStart.toISOString().slice(0,10), toStart: toStart.toISOString().slice(0,10), created, skipped },
  });

  return NextResponse.json({ created, skipped, fromStart: fromStart.toISOString().slice(0,10), toStart: toStart.toISOString().slice(0,10) });
}
