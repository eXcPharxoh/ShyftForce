// Returns the top 3 best-fit members for a single shift — used by the inline
// "Suggested" row inside the shift-edit dialog so a manager doesn't have to
// scan the whole roster. Same eligibility rules as /api/schedule/auto-fill
// (position match, no week-overlap, under 40h after this assignment), ranked
// by fewest current hours (load balancing).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { addDays, startOfWeek } from "@/lib/utils";
import { loadEligibilityData, disqualifyingReason } from "@/lib/schedule/eligibility";
import { z } from "zod";

const Schema = z.object({ shiftId: z.string().min(1) }).strict();
const MAX_HOURS = 40;

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const shift = await prisma.shift.findFirst({
    where: { id: parsed.data.shiftId, location: { organizationId: u.organizationId } },
  });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  const weekStart = startOfWeek(shift.startsAt);
  const weekEnd = addDays(weekStart, 7);

  const [members, weekShifts, eligibility] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
    }),
    prisma.shift.findMany({
      where: {
        location: { organizationId: u.organizationId },
        startsAt: { gte: weekStart, lt: weekEnd },
        memberId: { not: null },
        id: { not: shift.id }, // don't count the current shift against itself
      },
      select: { memberId: true, startsAt: true, endsAt: true },
    }),
    loadEligibilityData(u.organizationId, weekStart, weekEnd),
  ]);

  const hoursByMember = new Map<string, number>();
  const rangesByMember = new Map<string, { start: number; end: number }[]>();
  for (const s of weekShifts) {
    if (!s.memberId) continue;
    const h = (+s.endsAt - +s.startsAt) / 3600_000;
    hoursByMember.set(s.memberId, (hoursByMember.get(s.memberId) ?? 0) + h);
    if (!rangesByMember.has(s.memberId)) rangesByMember.set(s.memberId, []);
    rangesByMember.get(s.memberId)!.push({ start: +s.startsAt, end: +s.endsAt });
  }

  const startMs = +shift.startsAt;
  const endMs = +shift.endsAt;
  const shiftHours = (endMs - startMs) / 3600_000;

  type Suggestion = { memberId: string; name: string; currentHours: number; hoursAfter: number; reason: string };
  // Same tiered position logic as auto-fill: exact match wins, position-less
  // fallback is allowed but ranked lower so we never suggest a Dishwasher for
  // a Bartender shift over an actual Bartender.
  const eligible: (Suggestion & { exactMatch: boolean })[] = [];
  for (const m of members) {
    if (shift.position && m.position && m.position !== shift.position) continue;
    const ranges = rangesByMember.get(m.id) ?? [];
    if (ranges.some((r) => r.start < endMs && r.end > startMs)) continue;
    if (disqualifyingReason(m.id, shift.startsAt, shift.endsAt, eligibility)) continue;
    const current = hoursByMember.get(m.id) ?? 0;
    if (current + shiftHours > MAX_HOURS) continue;
    const exactMatch = !!shift.position && m.position === shift.position;
    eligible.push({
      memberId: m.id,
      name: m.user.name,
      currentHours: current,
      hoursAfter: current + shiftHours,
      reason: exactMatch
        ? `Position match · ${current.toFixed(1)}h this week`
        : `${current.toFixed(1)}h this week`,
      exactMatch,
    });
  }

  eligible.sort((a, b) =>
    (b.exactMatch ? 1 : 0) - (a.exactMatch ? 1 : 0) ||
    a.currentHours - b.currentHours ||
    a.name.localeCompare(b.name),
  );
  return NextResponse.json({ suggestions: eligible.slice(0, 3), totalEligible: eligible.length });
}
