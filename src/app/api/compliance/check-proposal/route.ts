import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { checkCompliance, type ShiftLite } from "@/lib/compliance/engine";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";

type ProposedShift = {
  memberId: string | null;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
};

function combine(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi]    = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

// Checks compliance against the union of (existing org shifts + a proposed list)
// so that adding new shifts on top of already-saved ones surfaces realistic violations.
export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json() as { shifts: ProposedShift[]; weekStart?: string };

  // Pull current org members + existing shifts in a +/- 1 week window around the proposal
  const proposalDates = body.shifts.map(s => +new Date(s.date));
  const windowStart = new Date(Math.min(...proposalDates) - 7 * 86400000);
  const windowEnd   = new Date(Math.max(...proposalDates) + 7 * 86400000);

  const [existing, members, settings] = await Promise.all([
    prisma.shift.findMany({
      where: { location: { organizationId: u.organizationId }, startsAt: { gte: windowStart, lt: windowEnd } },
    }),
    prisma.member.findMany({ where: { organizationId: u.organizationId }, include: { user: true } }),
    getOrCreateComplianceSettings(u.organizationId),
  ]);

  const proposedShifts: ShiftLite[] = body.shifts
    .filter(s => s.memberId)
    .map((s, idx) => {
      const startsAt = combine(s.date, s.startTime);
      let endsAt = combine(s.date, s.endTime);
      if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24*3600*1000);
      return { id: `proposal_${idx}`, memberId: s.memberId, startsAt, endsAt, status: "draft" };
    });

  const allShifts: ShiftLite[] = [
    ...existing.map(s => ({ id: s.id, memberId: s.memberId, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status })),
    ...proposedShifts,
  ];

  const violations = checkCompliance({
    shifts: allShifts,
    members: members.map(m => ({ id: m.id, name: m.user.name })),
    settings,
  });

  // Only return violations involving at least one PROPOSED shift (avoid noise from existing data)
  const proposalIds = new Set(proposedShifts.map(s => s.id));
  const relevant = violations.filter(v => v.shiftIds.some(id => proposalIds.has(id)));

  return NextResponse.json({
    settings,
    violations: relevant,
    summary: {
      total: relevant.length,
      errors:   relevant.filter(v => v.severity === "error").length,
      warnings: relevant.filter(v => v.severity === "warning").length,
    },
  });
}
