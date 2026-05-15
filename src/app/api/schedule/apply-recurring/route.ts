import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { addDays, startOfWeek } from "@/lib/utils";
import { audit } from "@/lib/audit";

// POST /api/schedule/apply-recurring  body: { weekStart?: ISO YYYY-MM-DD, publish?: boolean }
// Creates Shift records (drafts by default) for all active recurring patterns
// for the given week. Skips slots that already have an overlapping shift for
// that member.
export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const body = await req.json().catch(() => ({}));
  const weekStart = body.weekStart ? new Date(body.weekStart) : startOfWeek(addDays(new Date(), 7));
  weekStart.setHours(0,0,0,0);
  const weekEnd = addDays(weekStart, 7);
  const publish = !!body.publish;

  const recurring = await prisma.recurringShift.findMany({
    where: {
      active: true,
      member: { organizationId: u.organizationId },
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gte: weekStart } },
      ],
      effectiveFrom: { lte: weekEnd },
    },
    include: { member: true },
  });

  // Pre-fetch existing shifts in the week to dedupe
  const existing = await prisma.shift.findMany({
    where: { location: { organizationId: u.organizationId }, startsAt: { gte: weekStart, lt: weekEnd } },
    select: { memberId: true, startsAt: true, endsAt: true },
  });
  const haveOverlap = (memberId: string, starts: Date, ends: Date) =>
    existing.some(s => s.memberId === memberId && s.startsAt < ends && s.endsAt > starts);

  // Also skip if member has approved time-off in the slot
  const offs = await prisma.timeOffRequest.findMany({
    where: { member: { organizationId: u.organizationId }, status: "approved", startsOn: { lte: weekEnd }, endsOn: { gte: weekStart } },
    select: { memberId: true, startsOn: true, endsOn: true },
  });
  const onTimeOff = (memberId: string, day: Date) =>
    offs.some(o => o.memberId === memberId && o.startsOn <= day && o.endsOn >= day);

  // Batched createMany — was creating one row per recurring pattern.
  const rows: any[] = [];
  let skipped = 0;
  for (const rs of recurring) {
    const day = addDays(weekStart, (rs.dayOfWeek + 6) % 7);   // weekStart is Mon, dayOfWeek is 0=Sun
    const [sh, sm] = rs.startTime.split(":").map(Number);
    const [eh, em] = rs.endTime.split(":").map(Number);
    const startsAt = new Date(day); startsAt.setHours(sh, sm, 0, 0);
    let endsAt    = new Date(day); endsAt.setHours(eh, em, 0, 0);
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24*3600*1000); // overnight wrap

    if (haveOverlap(rs.memberId, startsAt, endsAt) || onTimeOff(rs.memberId, day)) { skipped++; continue; }

    rows.push({
      memberId: rs.memberId,
      locationId: rs.locationId,
      startsAt, endsAt,
      position: rs.position ?? null,
      status: publish ? "published" : "draft",
      isOpen: false,
    });
  }
  const created = rows.length > 0
    ? (await prisma.shift.createMany({ data: rows })).count
    : 0;

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "RecurringShift.apply",
    metadata: { weekStart: weekStart.toISOString().slice(0,10), created, skipped, publish },
  });

  return NextResponse.json({ created, skipped, weekStart: weekStart.toISOString().slice(0,10) });
}
