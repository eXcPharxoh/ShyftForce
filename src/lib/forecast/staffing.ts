// Translates predicted revenue per 30-min slot into a required-headcount profile.
// Inputs:
//   - target labor% (org-set, defaults to a sensible 25% if not configured)
//   - average hourly rate per location (sampled from actual member rates)
// Output: per-slot required headcount, total scheduled hours estimate, and a
// "minimum staffing" floor so we never drop below safe levels.

import type { ForecastSlot } from "./forecaster";

export type StaffingOptions = {
  targetLaborPct: number;     // e.g. 0.25 for 25%
  avgHourlyRate: number;
  minHeadcount: number;       // never go below this per slot during open hours
  openHourLocal: number;      // e.g. 9
  closeHourLocal: number;     // e.g. 22
};

export type StaffingSlot = ForecastSlot & {
  predictedHeadcount: number;
  predictedLaborCents: number;
};

export function translateToStaffing(slots: ForecastSlot[], opts: StaffingOptions): StaffingSlot[] {
  return slots.map((slot) => {
    const localHour = slot.slotStart.getHours();
    const isOpen = localHour >= opts.openHourLocal && localHour < opts.closeHourLocal;
    if (!isOpen) {
      return { ...slot, predictedHeadcount: 0, predictedLaborCents: 0 };
    }
    // labor budget for this slot
    const slotLaborBudget = slot.predictedRevenueCents * opts.targetLaborPct;
    const slotHours = (+slot.slotEnd - +slot.slotStart) / 3600_000; // 0.5h
    const headcountFromRevenue = opts.avgHourlyRate > 0
      ? Math.ceil(slotLaborBudget / (opts.avgHourlyRate * 100 * slotHours))
      : 0;
    const headcount = Math.max(opts.minHeadcount, headcountFromRevenue);
    const labor = Math.round(headcount * opts.avgHourlyRate * 100 * slotHours);
    return { ...slot, predictedHeadcount: headcount, predictedLaborCents: labor };
  });
}

/** Pack a per-slot headcount profile into shift blocks (greedy: each block lasts
 *  while the headcount requirement is non-zero AND non-decreasing within MAX_LEN). */
export type ShiftBlock = {
  startsAt: Date;
  endsAt: Date;
  headcount: number;
  predictedRevenueCents: number;
};

export function packIntoShifts(slots: StaffingSlot[], opts?: { maxShiftHours?: number; minShiftHours?: number }): ShiftBlock[] {
  const maxH = opts?.maxShiftHours ?? 8;
  const minH = opts?.minShiftHours ?? 4;
  const blocks: ShiftBlock[] = [];

  let i = 0;
  while (i < slots.length) {
    const s = slots[i];
    if (s.predictedHeadcount === 0) { i++; continue; }
    // Start a block; greedily extend
    const startIdx = i;
    let endIdx = i;
    while (
      endIdx + 1 < slots.length &&
      slots[endIdx + 1].predictedHeadcount > 0 &&
      ((+slots[endIdx + 1].slotEnd - +slots[startIdx].slotStart) / 3600_000) <= maxH &&
      slots[endIdx + 1].slotStart.getDate() === slots[startIdx].slotStart.getDate()
    ) {
      endIdx++;
    }
    const startsAt = slots[startIdx].slotStart;
    const endsAt = slots[endIdx].slotEnd;
    const lengthH = (+endsAt - +startsAt) / 3600_000;
    if (lengthH < minH) {
      // Extend forward into zero slots if possible to meet min length
      while (endIdx + 1 < slots.length && (+slots[endIdx + 1].slotEnd - +startsAt) / 3600_000 <= minH) endIdx++;
    }
    const peakHeadcount = Math.max(...slots.slice(startIdx, endIdx + 1).map((x) => x.predictedHeadcount));
    const blockRevenue = slots.slice(startIdx, endIdx + 1).reduce((a, x) => a + x.predictedRevenueCents, 0);
    // Emit one block per headcount level (so the auto-scheduler can fill by position)
    for (let h = 0; h < peakHeadcount; h++) {
      blocks.push({ startsAt, endsAt: slots[endIdx].slotEnd, headcount: 1, predictedRevenueCents: Math.round(blockRevenue / peakHeadcount) });
    }
    i = endIdx + 1;
  }
  return blocks;
}

export function inferAvgHourlyRate(rates: (number | null)[]): number {
  const nums = rates.filter((r): r is number => typeof r === "number" && r > 0);
  if (nums.length === 0) return 18; // fallback
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
