import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { checkCompliance } from "@/lib/compliance/engine";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";
import { calcPredictability } from "@/lib/compliance/predictability";
import { addDays } from "@/lib/utils";

// POST /api/compliance/check-shift
// body: { shift: { id?, memberId, startsAt, endsAt, status }, originalShift?: same shape, changeType?: "added"|"moved"|"canceled"|"shortened" }
//
// Lightweight pre-save check — returns the violations a single proposed change would create
// for the affected member's surrounding 28-day window, plus predictability-pay impact.
export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json();
  const proposed = body.shift;
  if (!proposed?.memberId || !proposed?.startsAt || !proposed?.endsAt) {
    return NextResponse.json({ error: "shift.memberId, startsAt, endsAt required" }, { status: 400 });
  }
  const startsAt = new Date(proposed.startsAt);
  const endsAt = new Date(proposed.endsAt);
  if (Number.isNaN(+startsAt) || Number.isNaN(+endsAt) || endsAt <= startsAt) {
    return NextResponse.json({ error: "invalid shift times" }, { status: 400 });
  }

  const member = await prisma.member.findFirst({
    where: { id: proposed.memberId, organizationId: u.organizationId },
    include: { user: true },
  });
  if (!member) return NextResponse.json({ error: "member not in org" }, { status: 404 });

  const settings = await getOrCreateComplianceSettings(u.organizationId);

  const winStart = addDays(startsAt, -14);
  const winEnd   = addDays(endsAt, 14);

  const surrounding = await prisma.shift.findMany({
    where: {
      memberId: member.id,
      startsAt: { gte: winStart, lt: winEnd },
      // exclude the shift being edited (avoid double-counting)
      ...(proposed.id ? { id: { not: proposed.id } } : {}),
    },
  });

  const merged = [
    ...surrounding.map(s => ({ id: s.id, memberId: s.memberId, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status })),
    { id: proposed.id ?? "proposed", memberId: member.id, startsAt, endsAt, status: proposed.status ?? "draft" },
  ];

  const violations = checkCompliance({
    shifts: merged,
    members: [{ id: member.id, name: member.user.name, birthday: member.birthday }],
    settings,
    publishingNow: !!body.publishingNow,
  });

  // Predictability pay if this is a change to a published shift inside the lead window
  let predictability = null as null | ReturnType<typeof calcPredictability>;
  if (body.changeType && (proposed.status === "published" || body.originalShift?.status === "published")) {
    predictability = calcPredictability({
      shiftId: proposed.id ?? "proposed",
      memberId: member.id,
      changeType: body.changeType,
      shiftStartsAt: body.changeType === "moved" && body.originalShift ? new Date(body.originalShift.startsAt) : startsAt,
      hourlyRate: member.hourlyRate ?? 0,
      jurisdiction: settings.jurisdiction ?? "default",
    });
  }

  return NextResponse.json({
    member: { id: member.id, name: member.user.name },
    violations,
    predictability,
    settings: { jurisdiction: settings.jurisdiction, predictiveSchedulingDays: settings.predictiveSchedulingDays },
  });
}
