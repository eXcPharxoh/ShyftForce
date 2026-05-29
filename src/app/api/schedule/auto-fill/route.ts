// Rules-based bulk shift assigner (the non-AI counterpart to /api/schedule/auto).
// For every open shift in the requested week, pick the best-fit member:
//   1. Active member at the same org.
//   2. Position match: shift.position === member.position. If a shift has no
//      position set, any active member is eligible.
//   3. No overlap with another assigned shift in the same week.
//   4. Stays under maxHoursPerWeek (default 40) after this assignment.
//   5. Among eligibles, pick the one with the FEWEST hours assigned so far this
//      week — load-balancing / round-robin.
//
// Supports a `dryRun: true` mode that returns the preview without writing —
// powers the "Auto-fill open shifts" confirm dialog on /schedule.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { addDays, startOfWeek } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  weekStart: z.string().optional(), // ISO YYYY-MM-DD; defaults to this week
  maxHoursPerWeek: z.number().int().min(1).max(168).optional(),
  dryRun: z.boolean().optional(),
}).strict();

type Assignment = {
  shiftId: string;
  shiftLabel: string;
  memberId: string;
  memberName: string;
  hoursAfter: number;
};
type Skipped = { shiftId: string; shiftLabel: string; reason: string };

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const maxHours = parsed.data.maxHoursPerWeek ?? 40;
  const weekStart = parsed.data.weekStart
    ? startOfWeek(new Date(parsed.data.weekStart))
    : startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);

  // Pull this week's shifts (open + assigned) and active members.
  const [shifts, members] = await Promise.all([
    prisma.shift.findMany({
      where: {
        location: { organizationId: u.organizationId },
        startsAt: { gte: weekStart, lt: weekEnd },
      },
      include: { location: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  // Pre-compute current hours per member from already-assigned shifts.
  const hoursByMember = new Map<string, number>();
  // Track per-member assigned time ranges to detect overlap.
  const rangesByMember = new Map<string, { start: number; end: number }[]>();
  for (const s of shifts) {
    if (!s.memberId) continue;
    const h = (+s.endsAt - +s.startsAt) / 3600_000;
    hoursByMember.set(s.memberId, (hoursByMember.get(s.memberId) ?? 0) + h);
    if (!rangesByMember.has(s.memberId)) rangesByMember.set(s.memberId, []);
    rangesByMember.get(s.memberId)!.push({ start: +s.startsAt, end: +s.endsAt });
  }

  // Open shifts to fill, ordered by start time so a single member's earlier
  // assignments are accounted for in later overlap checks.
  const openShifts = shifts.filter((s) => s.memberId == null);

  const assignments: Assignment[] = [];
  const skipped: Skipped[] = [];

  for (const sh of openShifts) {
    const hours = (+sh.endsAt - +sh.startsAt) / 3600_000;
    const startMs = +sh.startsAt;
    const endMs = +sh.endsAt;
    const label = `${sh.position ?? "Shift"} · ${fmtDay(sh.startsAt)} ${fmtTime(sh.startsAt)}–${fmtTime(sh.endsAt)} (${sh.location.name})`;

    // Find eligible members.
    const eligible: { m: typeof members[number]; current: number }[] = [];
    for (const m of members) {
      // Position match (only enforce when the shift declares one).
      if (sh.position && m.position && sh.position !== m.position) continue;
      // Overlap check.
      const ranges = rangesByMember.get(m.id) ?? [];
      const overlaps = ranges.some((r) => r.start < endMs && r.end > startMs);
      if (overlaps) continue;
      const current = hoursByMember.get(m.id) ?? 0;
      // Max-hours guard.
      if (current + hours > maxHours) continue;
      eligible.push({ m, current });
    }

    if (eligible.length === 0) {
      skipped.push({
        shiftId: sh.id,
        shiftLabel: label,
        reason: sh.position
          ? `No active member with position "${sh.position}" available without overlap or going over ${maxHours}h.`
          : `No active member available without overlap or going over ${maxHours}h.`,
      });
      continue;
    }

    // Lowest current hours first; ties broken by name for determinism.
    eligible.sort((a, b) => a.current - b.current || a.m.user.name.localeCompare(b.m.user.name));
    const winner = eligible[0];

    assignments.push({
      shiftId: sh.id,
      shiftLabel: label,
      memberId: winner.m.id,
      memberName: winner.m.user.name,
      hoursAfter: winner.current + hours,
    });
    // Tentatively assign — affects subsequent iterations.
    hoursByMember.set(winner.m.id, winner.current + hours);
    if (!rangesByMember.has(winner.m.id)) rangesByMember.set(winner.m.id, []);
    rangesByMember.get(winner.m.id)!.push({ start: startMs, end: endMs });
  }

  if (parsed.data.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      assignments,
      skipped,
      totalOpen: openShifts.length,
    });
  }

  // Apply.
  for (const a of assignments) {
    await prisma.shift.update({
      where: { id: a.shiftId },
      data: { memberId: a.memberId, isOpen: false },
    });
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "Shift",
    metadata: {
      kind: "auto_fill",
      weekStart: weekStart.toISOString(),
      assigned: assignments.length,
      skipped: skipped.length,
      maxHoursPerWeek: maxHours,
    },
  });

  return NextResponse.json({
    ok: true,
    dryRun: false,
    assignments,
    skipped,
    totalOpen: openShifts.length,
  });
}
