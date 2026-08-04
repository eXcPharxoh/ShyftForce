// Turns raw punches into payable hours.
//
// AttendanceLog rows were the ONLY thing clock-in/out ever wrote, and every
// payroll + labour-cost surface reads TimesheetEntry rows inside an open
// PayPeriod. Nothing in the app created either, so for any real organisation
// "Attendance & Payroll" showed "No active pay period / 0h / $0.00" forever,
// Reports showed "0 timesheets", the dashboard's labour-cost KPI stayed $0, and
// the Finch payroll push had nothing to send. This module closes that gap.

import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/utils";

/** Bi-weekly by default, aligned to week boundaries so periods tile cleanly. */
const PERIOD_DAYS = 14;

/**
 * Find the org's open pay period, creating one around `on` if none exists.
 * Safe under concurrency: a unique-violation race just re-reads the winner.
 */
export async function ensureOpenPayPeriod(organizationId: string, on: Date = new Date()) {
  const existing = await prisma.payPeriod.findFirst({
    where: { organizationId, status: "open" },
  });
  if (existing) return existing;

  const startsOn = startOfWeek(on);
  startsOn.setHours(0, 0, 0, 0);
  const endsOn = new Date(startsOn.getTime() + PERIOD_DAYS * 86400_000);

  try {
    return await prisma.payPeriod.create({
      data: { organizationId, startsOn, endsOn, status: "open" },
    });
  } catch {
    // Someone else created it in the gap — take theirs.
    return await prisma.payPeriod.findFirst({ where: { organizationId, status: "open" } });
  }
}

/**
 * Given a member's punches for one calendar day, return payable hours:
 * paired clock_in → clock_out, minus any break_start → break_end inside them.
 */
export function hoursFromPunches(
  punches: { type: string; at: Date }[],
): number {
  const sorted = [...punches].sort((a, b) => +a.at - +b.at);
  let worked = 0;
  let inAt: Date | null = null;
  let breakAt: Date | null = null;
  let breakMs = 0;

  for (const p of sorted) {
    if (p.type === "clock_in") { inAt = p.at; breakMs = 0; breakAt = null; }
    else if (p.type === "break_start" && inAt) { breakAt = p.at; }
    else if (p.type === "break_end" && breakAt) { breakMs += +p.at - +breakAt; breakAt = null; }
    else if (p.type === "clock_out" && inAt) {
      worked += Math.max(0, (+p.at - +inAt) - breakMs);
      inAt = null; breakAt = null; breakMs = 0;
    }
  }
  return worked / 3_600_000;
}

/**
 * Recompute the member's TimesheetEntry for the day containing `at`, from that
 * day's punches. Called after a clock_out so hours appear immediately.
 *
 * Idempotent: re-running just rewrites the same day's total, so a corrected or
 * replayed punch can't double-count. Never throws into the caller — a payroll
 * bookkeeping failure must not block someone from clocking out.
 */
export async function syncTimesheetForDay(memberId: string, organizationId: string, at: Date) {
  try {
    const dayStart = new Date(at); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400_000);

    const punches = await prisma.attendanceLog.findMany({
      where: { memberId, at: { gte: dayStart, lt: dayEnd } },
      select: { type: true, at: true },
      orderBy: { at: "asc" },
    });
    const hours = hoursFromPunches(punches);
    if (hours <= 0) return null;

    const period = await ensureOpenPayPeriod(organizationId, at);
    if (!period) return null;

    const existing = await prisma.timesheetEntry.findFirst({
      where: { payPeriodId: period.id, memberId, date: dayStart },
      select: { id: true, approved: true },
    });

    if (existing) {
      // Don't silently rewrite hours a manager already approved — flag instead
      // so the change is reviewed rather than applied behind their back.
      if (existing.approved) {
        return prisma.timesheetEntry.update({
          where: { id: existing.id },
          data: { hours, flagged: true, notes: "Punches changed after approval — please re-check." },
        });
      }
      return prisma.timesheetEntry.update({ where: { id: existing.id }, data: { hours } });
    }

    return prisma.timesheetEntry.create({
      data: { payPeriodId: period.id, memberId, date: dayStart, hours },
    });
  } catch (e) {
    console.error("[timesheets] sync failed (non-fatal):", e);
    return null;
  }
}
