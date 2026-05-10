// Orchestrates the forecaster: pulls history + context, runs the forecaster,
// translates to staffing, persists DemandForecast rows, and provides apply-as-draft.

import { prisma } from "@/lib/prisma";
import { forecast } from "./forecaster";
import { translateToStaffing, inferAvgHourlyRate, packIntoShifts } from "./staffing";

export type RegenerateInput = {
  organizationId: string;
  locationId: string;
  weekStart: Date;
  daysAhead?: number;
  targetLaborPct?: number;
  openHourLocal?: number;
  closeHourLocal?: number;
};

export async function regenerateForecast(opts: RegenerateInput) {
  const days = opts.daysAhead ?? 7;
  const now = new Date();

  const [loc, history, contexts, members] = await Promise.all([
    prisma.location.findFirst({ where: { id: opts.locationId, organizationId: opts.organizationId } }),
    prisma.posRevenueSnapshot.findMany({
      where: {
        locationId: opts.locationId,
        intervalStart: { gte: new Date(now.getTime() - 8 * 7 * 86400_000) },
      },
      orderBy: { intervalStart: "asc" },
    }),
    prisma.demandContext.findMany({
      where: {
        organizationId: opts.organizationId,
        OR: [{ locationId: opts.locationId }, { locationId: null }],
        startsAt: { lt: new Date(opts.weekStart.getTime() + days * 86400_000) },
        endsAt:   { gt: opts.weekStart },
      },
    }),
    prisma.member.findMany({
      where: { organizationId: opts.organizationId, locationId: opts.locationId, status: "active" },
      select: { hourlyRate: true },
    }),
  ]);
  if (!loc) throw new Error("location not in org");

  const slots = forecast({
    history: history.map(h => ({ intervalStart: h.intervalStart, intervalEnd: h.intervalEnd, grossSalesCents: h.grossSalesCents })),
    contextEvents: contexts.map(c => ({ startsAt: c.startsAt, endsAt: c.endsAt, expectedImpactPct: c.expectedImpactPct, label: c.label })),
    weekStart: opts.weekStart,
    daysAhead: days,
    now,
  });

  const staffed = translateToStaffing(slots, {
    targetLaborPct: opts.targetLaborPct ?? 0.25,
    avgHourlyRate: inferAvgHourlyRate(members.map((m) => m.hourlyRate)),
    minHeadcount: 1,
    openHourLocal: opts.openHourLocal ?? 9,
    closeHourLocal: opts.closeHourLocal ?? 22,
  });

  // Persist (replace this week's slots for this location)
  await prisma.demandForecast.deleteMany({
    where: {
      locationId: opts.locationId,
      slotStart: { gte: opts.weekStart, lt: new Date(opts.weekStart.getTime() + days * 86400_000) },
    },
  });
  await prisma.demandForecast.createMany({
    data: staffed.map((s) => ({
      organizationId: opts.organizationId,
      locationId: opts.locationId,
      slotStart: s.slotStart,
      slotEnd: s.slotEnd,
      predictedRevenueCents: s.predictedRevenueCents,
      predictedHeadcount: s.predictedHeadcount,
      confidence: s.confidence,
      contextNotes: s.contextNotes,
      generatedBy: "autopilot",
    })),
  });

  return {
    slots: staffed.length,
    totalPredictedRevenueCents: staffed.reduce((a, s) => a + s.predictedRevenueCents, 0),
    totalPredictedHours: staffed.reduce((a, s) => a + s.predictedHeadcount * 0.5, 0),
    historySamples: history.length,
    contextCount: contexts.length,
  };
}

export type ApplyDraftInput = {
  organizationId: string;
  locationId: string;
  weekStart: Date;
  daysAhead?: number;
};

/** Read the saved forecast and create draft Shift rows from it (1 shift per
 *  predicted headcount, packed into ≥4h blocks). Existing draft shifts in the
 *  same window for this location are deleted first to avoid duplicates. */
export async function applyForecastAsDraft(opts: ApplyDraftInput) {
  const days = opts.daysAhead ?? 7;
  const winEnd = new Date(opts.weekStart.getTime() + days * 86400_000);

  const saved = await prisma.demandForecast.findMany({
    where: {
      organizationId: opts.organizationId,
      locationId: opts.locationId,
      slotStart: { gte: opts.weekStart, lt: winEnd },
    },
    orderBy: { slotStart: "asc" },
  });
  if (saved.length === 0) throw new Error("No forecast found — regenerate first");

  // Reuse the staffing slot shape: forecaster output + headcount
  const slots = saved.map((s) => ({
    slotStart: s.slotStart,
    slotEnd: s.slotEnd,
    predictedRevenueCents: s.predictedRevenueCents,
    predictedHeadcount: s.predictedHeadcount,
    confidence: s.confidence,
    contextNotes: s.contextNotes,
    predictedLaborCents: 0,
  }));
  const blocks = packIntoShifts(slots);

  // Replace existing drafts in window for this location (don't touch published)
  await prisma.shift.deleteMany({
    where: {
      locationId: opts.locationId,
      status: "draft",
      startsAt: { gte: opts.weekStart, lt: winEnd },
    },
  });

  let created = 0;
  for (const b of blocks) {
    await prisma.shift.create({
      data: {
        locationId: opts.locationId,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: "draft",
        isOpen: true,
        memberId: null,
        notes: `Forecast: ${(b.predictedRevenueCents / 100).toFixed(0)} predicted revenue`,
      },
    });
    created++;
  }
  return { created, blocks: blocks.length };
}
