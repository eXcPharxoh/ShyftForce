// Tip pool distribution engine. Given a total tip pool + the members who worked
// on the day at a location, distribute by rule:
//   - hours: weighted by hours worked
//   - role_weighted: weighted by role weights (e.g. servers 1.0, bussers 0.4, barbacks 0.3)
//   - equal: split evenly
//   - custom: caller passes weights map

import { prisma } from "@/lib/prisma";

export type DistributionRule = "hours" | "role_weighted" | "equal" | "custom";

const ROLE_WEIGHTS: Record<string, number> = {
  Server: 1.0,
  Bartender: 1.0,
  "Server Assistant": 0.5,
  Runner: 0.45,
  Busser: 0.4,
  Barback: 0.3,
  Host: 0.2,
  Hostess: 0.2,
  // Anything else defaults to 0 (BOH usually not on tip pool unless explicitly added)
};

export type ContributorRow = {
  memberId: string;
  name: string;
  position: string | null;
  hours: number;
  weight: number;
  amountCents: number;
};

export type DistributionInput = {
  organizationId: string;
  locationId: string;
  date: Date;                  // local day
  totalTipsCents: number;
  rule: DistributionRule;
  customWeights?: Record<string, number>;  // memberId → multiplier
  includePositions?: string[]; // if set, only these positions get a cut
};

export async function distributeTips(input: DistributionInput): Promise<{ rows: ContributorRow[]; totalDistributedCents: number; unallocatedCents: number }> {
  const dayStart = new Date(input.date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(dayStart.getTime() + 86400_000);

  // Pull shifts for the day at the location
  const shifts = await prisma.shift.findMany({
    where: {
      locationId: input.locationId,
      memberId: { not: null },
      startsAt: { lt: dayEnd },
      endsAt:   { gt: dayStart },
      status: "published",
    },
    include: { member: { include: { user: true } } },
  });

  // Aggregate hours per member (within the day)
  const byMember = new Map<string, { name: string; position: string | null; hours: number }>();
  for (const s of shifts) {
    if (!s.memberId) continue;
    const overlapStart = new Date(Math.max(+s.startsAt, +dayStart));
    const overlapEnd = new Date(Math.min(+s.endsAt, +dayEnd));
    const h = Math.max(0, (+overlapEnd - +overlapStart) / 3600_000);
    if (h === 0) continue;
    const slot = byMember.get(s.memberId) ?? { name: s.member?.user.name ?? "?", position: s.position, hours: 0 };
    slot.hours += h;
    byMember.set(s.memberId, slot);
  }

  // Apply position filter (if any)
  const eligible = [...byMember.entries()].filter(([, v]) => {
    if (!input.includePositions || input.includePositions.length === 0) return true;
    return v.position && input.includePositions.includes(v.position);
  });

  if (eligible.length === 0) {
    return { rows: [], totalDistributedCents: 0, unallocatedCents: input.totalTipsCents };
  }

  // Compute weights
  const weighted = eligible.map(([memberId, v]) => {
    let weight = 1;
    if (input.rule === "equal") weight = 1;
    else if (input.rule === "hours") weight = v.hours;
    else if (input.rule === "role_weighted") {
      const roleW = v.position ? (ROLE_WEIGHTS[v.position] ?? 0) : 0;
      weight = roleW * v.hours;
    } else if (input.rule === "custom") {
      const mult = input.customWeights?.[memberId] ?? 1;
      weight = mult * v.hours;
    }
    return { memberId, ...v, weight };
  });
  const totalWeight = weighted.reduce((a, w) => a + w.weight, 0);
  if (totalWeight === 0) {
    return { rows: [], totalDistributedCents: 0, unallocatedCents: input.totalTipsCents };
  }

  // Distribute (integer-cent allocation, remainder goes to highest-weight)
  const rows: ContributorRow[] = weighted.map((w) => ({
    memberId: w.memberId,
    name: w.name,
    position: w.position,
    hours: w.hours,
    weight: w.weight,
    amountCents: Math.floor((w.weight / totalWeight) * input.totalTipsCents),
  }));
  const sumCents = rows.reduce((a, r) => a + r.amountCents, 0);
  const remainder = input.totalTipsCents - sumCents;
  if (remainder > 0 && rows.length > 0) {
    const top = rows.sort((a, b) => b.weight - a.weight)[0];
    top.amountCents += remainder;
  }

  return { rows: rows.sort((a, b) => b.amountCents - a.amountCents), totalDistributedCents: input.totalTipsCents, unallocatedCents: 0 };
}
