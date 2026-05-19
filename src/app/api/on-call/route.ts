// On-call shifts. Separate from regular Shift because:
//   - Pay rules differ (daily stipend + premium if called in)
//   - Fairness matters (who got called in last weekend)
//   - The fair-balance suggestor uses recent on-call hours to rotate
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/utils";

const CreateSchema = z.object({
  locationId:               z.string().nullable().optional(),
  memberId:                 z.string().min(1),
  startsAt:                 z.string().datetime(),
  endsAt:                   z.string().datetime(),
  stipendCents:             z.number().int().min(0).max(10_000_00).default(0),
  calledInPremiumMultiplier:z.number().min(1).max(5).nullable().optional(),
  notes:                    z.string().max(500).nullable().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const memberId = url.searchParams.get("member_id");
  const suggest  = url.searchParams.get("suggest");

  // SUGGEST mode: ranked list of who's been on-call LEAST in the last 60 days
  if (suggest === "fair_rotation") {
    const since = addDays(new Date(), -60);
    const members = await prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active", role: { not: "ADMIN" } },
      include: {
        user: { select: { name: true } },
        onCallShifts: { where: { startsAt: { gte: since } } },
      },
    });
    const ranked = members.map(m => {
      const hours = m.onCallShifts.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600_000, 0);
      const calledHours = m.onCallShifts.reduce((a, s) => a + (s.calledInHours ?? 0), 0);
      const last = m.onCallShifts.length > 0
        ? new Date(Math.max(...m.onCallShifts.map(s => +s.startsAt)))
        : null;
      return {
        memberId: m.id, name: m.user.name,
        onCallHoursLast60: Math.round(hours * 10) / 10,
        calledInHoursLast60: Math.round(calledHours * 10) / 10,
        lastOnCallAt: last?.toISOString() ?? null,
      };
    }).sort((a, b) => {
      if (a.onCallHoursLast60 !== b.onCallHoursLast60) return a.onCallHoursLast60 - b.onCallHoursLast60;
      const la = a.lastOnCallAt ? +new Date(a.lastOnCallAt) : 0;
      const lb = b.lastOnCallAt ? +new Date(b.lastOnCallAt) : 0;
      return la - lb;
    });
    return NextResponse.json({ ranked });
  }

  const where: any = { organizationId: u.organizationId };
  if (memberId) where.memberId = memberId;
  // Default: upcoming + recent
  if (!memberId) where.startsAt = { gte: addDays(new Date(), -7) };
  const items = await prisma.onCallShift.findMany({
    where,
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { startsAt: "asc" },
    take: 200,
  });
  return NextResponse.json({
    items: items.map(o => ({
      id: o.id, memberId: o.memberId, memberName: o.member.user.name,
      startsAt: o.startsAt, endsAt: o.endsAt,
      stipendCents: o.stipendCents, calledInHours: o.calledInHours,
      calledInPremiumMultiplier: o.calledInPremiumMultiplier,
      notes: o.notes,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Cross-tenant
  const member = await prisma.member.findFirst({
    where: { id: parsed.data.memberId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Member not in org" }, { status: 404 });

  const shift = await prisma.onCallShift.create({
    data: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId ?? null,
      memberId:       parsed.data.memberId,
      startsAt:       new Date(parsed.data.startsAt),
      endsAt:         new Date(parsed.data.endsAt),
      stipendCents:   parsed.data.stipendCents,
      calledInPremiumMultiplier: parsed.data.calledInPremiumMultiplier ?? null,
      notes:          parsed.data.notes ?? null,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "OnCallShift", entityId: shift.id,
    metadata: { memberId: parsed.data.memberId, startsAt: parsed.data.startsAt },
  });

  return NextResponse.json({ ok: true, shift });
}
