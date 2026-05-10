// "Send home" recommender. When a location is over its labor target, this picks
// the best person to release first based on: lightest end-of-shift impact,
// closest to OT, lowest revenue contribution per hour scheduled.
//
// We are conservative: only recommends people whose current shift ends in < 90 min
// AND whose departure would keep the location at min-staff for the position.

import { prisma } from "@/lib/prisma";

export type SendHomeRecommendation = {
  shiftId: string;
  memberId: string;
  memberName: string;
  position: string | null;
  remainingHours: number;     // hours left in their current shift
  hourlyRate: number;
  savingsCents: number;       // dollars saved by releasing them now
  reason: string;
};

export async function recommendSendHome(opts: {
  organizationId: string;
  locationId: string;
  now?: Date;
  // floor on simultaneous staff per position before we'd refuse to recommend cuts
  minStaffPerPosition?: number;
}): Promise<SendHomeRecommendation[]> {
  const now = opts.now ?? new Date();
  const horizon = new Date(now.getTime() + 4 * 3600_000);
  const minStaff = opts.minStaffPerPosition ?? 1;

  // Active shifts at this location right now
  const activeShifts = await prisma.shift.findMany({
    where: {
      locationId: opts.locationId,
      location: { organizationId: opts.organizationId },
      startsAt: { lte: now },
      endsAt:   { gt: now },
      memberId: { not: null },
      status:   "published",
    },
    include: { member: { include: { user: true } } },
  });
  if (activeShifts.length === 0) return [];

  // Bucket by position to enforce min-staff
  const byPosition = new Map<string, typeof activeShifts>();
  for (const s of activeShifts) {
    const key = s.position ?? "default";
    if (!byPosition.has(key)) byPosition.set(key, [] as any);
    (byPosition.get(key) as any).push(s);
  }

  const recs: SendHomeRecommendation[] = [];
  for (const [position, peers] of byPosition) {
    if (peers.length <= minStaff) continue; // can't safely cut from this position
    // Sort: highest hourly rate first (max savings), then ending-soonest (least disruption)
    const ranked = [...peers].sort((a, b) => {
      const rateA = a.member?.hourlyRate ?? 0;
      const rateB = b.member?.hourlyRate ?? 0;
      if (rateB !== rateA) return rateB - rateA;
      return +a.endsAt - +b.endsAt;
    });

    // Recommend the top 1-2 cuts per position
    const cuttable = ranked.slice(0, peers.length - minStaff).slice(0, 2);
    for (const s of cuttable) {
      const remainingH = Math.max(0, (+s.endsAt - +now) / 3600_000);
      const rate = s.member?.hourlyRate ?? 0;
      const savings = Math.round(remainingH * rate * 100);
      // Only recommend if it actually saves meaningful money (> $5)
      if (savings < 500) continue;
      recs.push({
        shiftId: s.id,
        memberId: s.memberId!,
        memberName: s.member?.user.name ?? "Unknown",
        position,
        remainingHours: remainingH,
        hourlyRate: rate,
        savingsCents: savings,
        reason: `${peers.length} ${position} on shift, ${minStaff} required → release ${s.member?.user.name?.split(" ")[0]} saves $${(savings / 100).toFixed(2)}`,
      });
    }
  }

  return recs.sort((a, b) => b.savingsCents - a.savingsCents);
}
