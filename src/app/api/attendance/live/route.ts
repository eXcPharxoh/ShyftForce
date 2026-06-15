import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/**
 * Live attendance status — who's clocked in / on break right now.
 *
 * Bounded to the last 24h instead of scanning every AttendanceLog row
 * the org has ever produced (the prior unbounded scan would OOM a
 * lambda once a multi-location org accumulated ~100k punches). 24h is
 * enough: anyone who hasn't punched in the last day isn't "live."
 *
 * We also order DESC + dedupe by memberId in a single pass so we read
 * each member's latest event once, instead of replaying every event.
 */
export async function GET() {
  const u = await requireUser();
  const since = new Date(Date.now() - 24 * 3600 * 1000);

  const logs = await prisma.attendanceLog.findMany({
    where: {
      member: { organizationId: u.organizationId },
      at: { gte: since },
    },
    orderBy: { at: "desc" },
    select: { memberId: true, type: true },
    take: 5000,
  });

  // Latest event per member determines their current status.
  const status = new Map<string, "in" | "break" | "out">();
  for (const l of logs) {
    if (status.has(l.memberId)) continue;
    if (l.type === "clock_in" || l.type === "break_end") status.set(l.memberId, "in");
    else if (l.type === "break_start") status.set(l.memberId, "break");
    else if (l.type === "clock_out") status.set(l.memberId, "out");
  }

  let working = 0, onBreak = 0;
  for (const v of status.values()) {
    if (v === "in") working++;
    else if (v === "break") onBreak++;
  }

  return NextResponse.json({ working, onBreak, lateOrAbsent: 0 });
}
