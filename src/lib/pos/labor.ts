// Live labor cost vs revenue calculator. Pulls scheduled+actual hours and overlays
// the most recent revenue snapshots to compute labor % per location.

import { prisma } from "@/lib/prisma";
import type { LaborSnapshot } from "./types";

export type LaborWindow = "today" | "now_4h" | "this_week";

function windowRange(now: Date, w: LaborWindow): { from: Date; to: Date } {
  if (w === "now_4h") {
    return { from: new Date(now.getTime() - 4 * 3600_000), to: now };
  }
  if (w === "this_week") {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    const monday = new Date(d); monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return { from: monday, to: new Date(monday.getTime() + 7 * 86400_000) };
  }
  // today
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  return { from: d, to: new Date(d.getTime() + 86400_000) };
}

function targetPctFor(loc: { weeklyBudget: number | null; projectedRevenue: number | null }): number | null {
  if (!loc.weeklyBudget || !loc.projectedRevenue || loc.projectedRevenue === 0) return null;
  return Math.min(60, Math.max(15, (loc.weeklyBudget / loc.projectedRevenue) * 100));
}

export async function liveLabor(opts: { organizationId: string; window: LaborWindow; now?: Date }): Promise<LaborSnapshot[]> {
  const now = opts.now ?? new Date();
  const { from, to } = windowRange(now, opts.window);

  const locations = await prisma.location.findMany({
    where: { organizationId: opts.organizationId },
    select: { id: true, name: true, weeklyBudget: true, projectedRevenue: true },
  });
  const locIds = locations.map((l) => l.id);

  // Scheduled hours: shifts whose [startsAt,endsAt] overlap [from,to]
  const shifts = await prisma.shift.findMany({
    where: {
      locationId: { in: locIds },
      memberId: { not: null },
      startsAt: { lt: to },
      endsAt:   { gt: from },
    },
    include: { member: { select: { hourlyRate: true } } },
  });

  // Revenue snapshots overlapping the window
  const snapshots = await prisma.posRevenueSnapshot.findMany({
    where: {
      locationId: { in: locIds },
      intervalStart: { lt: to },
      intervalEnd:   { gt: from },
    },
  });

  // Aggregate per location
  return locations.map((loc) => {
    const locShifts = shifts.filter((s) => s.locationId === loc.id);
    let scheduledHours = 0;
    let laborCostCents = 0;
    for (const s of locShifts) {
      const segStart = new Date(Math.max(+s.startsAt, +from));
      const segEnd = new Date(Math.min(+s.endsAt, +to));
      const h = Math.max(0, (+segEnd - +segStart) / 3600_000);
      const rate = s.member?.hourlyRate ?? 0;
      scheduledHours += h;
      laborCostCents += Math.round(h * rate * 100);
    }
    const locSnaps = snapshots.filter((s) => s.locationId === loc.id);
    let grossSalesCents = 0;
    for (const s of locSnaps) {
      // Pro-rate snapshot to the overlap with our window
      const overlap = Math.max(0, Math.min(+to, +s.intervalEnd) - Math.max(+from, +s.intervalStart));
      const total = Math.max(1, +s.intervalEnd - +s.intervalStart);
      grossSalesCents += Math.round((overlap / total) * s.grossSalesCents);
    }
    const laborPct = grossSalesCents > 0 ? (laborCostCents / grossSalesCents) * 100 : null;
    const target = targetPctFor(loc);
    let status: LaborSnapshot["status"] = "no_data";
    if (laborPct == null) status = grossSalesCents === 0 && laborCostCents === 0 ? "no_data" : "no_data";
    else if (target == null) status = "no_data";
    else if (laborPct < target * 0.85) status = "under";
    else if (laborPct > target * 1.15) status = "over";
    else status = "on_target";
    return {
      locationId: loc.id,
      locationName: loc.name,
      intervalStart: from,
      intervalEnd: to,
      laborCostCents,
      scheduledHours,
      grossSalesCents,
      laborPct,
      targetPct: target,
      status,
    };
  });
}
