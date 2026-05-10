// Cross-employer worker identity. The WorkerProfile is created lazily on first
// read so existing users don't need a backfill migration. Reputation is denormalized
// into the profile and recomputed on demand (or by cron).

import { prisma } from "@/lib/prisma";

export async function getOrCreateWorkerProfile(userId: string) {
  const found = await prisma.workerProfile.findUnique({ where: { userId } });
  if (found) return found;
  return await prisma.workerProfile.create({
    data: {
      userId,
      // Pull legal name guess from User.name on first creation; user can edit later
    },
  });
}

export async function recomputeReputation(workerProfileId: string) {
  const profile = await prisma.workerProfile.findUnique({
    where: { id: workerProfileId },
    include: { user: true, externalShifts: true, networkClaims: true },
  });
  if (!profile) throw new Error("worker profile not found");

  // Internal shifts (within their primary org)
  const member = await prisma.member.findUnique({ where: { userId: profile.userId } });
  const memberShifts = member
    ? await prisma.shift.findMany({
        where: { memberId: member.id, status: "published", endsAt: { lt: new Date() } },
        include: { location: true },
      })
    : [];

  // Cross-org claims that completed
  const externalClaimedShifts = profile.externalShifts.filter((s) => s.endsAt < new Date() && s.status === "published");
  const totalShifts = memberShifts.length + externalClaimedShifts.length;

  // No-shows = shifts that started but had no clock-in within 30min before/after start
  const allShiftIds = [...memberShifts.map((s) => s.id), ...externalClaimedShifts.map((s) => s.id)];
  let noShows = 0;
  if (allShiftIds.length > 0) {
    const logs = member
      ? await prisma.attendanceLog.findMany({
          where: { memberId: member.id, type: "clock_in" },
          select: { at: true },
        })
      : [];
    for (const s of [...memberShifts, ...externalClaimedShifts]) {
      const start = s.startsAt.getTime();
      const window = 30 * 60_000;
      const hit = logs.some((l) => Math.abs(l.at.getTime() - start) <= window);
      if (!hit) noShows++;
    }
  }

  // Distinct employers = primary org (1 if member exists) + count of distinct posting orgs from completed claims
  const distinctClaimOrgs = new Set<string>();
  for (const c of profile.networkClaims) {
    if (c.status === "claimed" || c.status === "closed") distinctClaimOrgs.add(c.postingOrgId);
  }
  const totalEmployers = (member ? 1 : 0) + distinctClaimOrgs.size;

  // Reputation: simple base 80 + bonus for many shifts, penalty for no-shows
  const baseScore = 80;
  const completionBonus = Math.min(15, totalShifts * 0.5);
  const noShowPenalty = totalShifts > 0 ? (noShows / totalShifts) * 100 : 0;
  const reputationScore = Math.max(0, Math.min(100, baseScore + completionBonus - noShowPenalty));

  return await prisma.workerProfile.update({
    where: { id: workerProfileId },
    data: {
      totalShiftsCompleted: totalShifts,
      totalNoShows: noShows,
      totalEmployers,
      reputationScore,
      reputationUpdatedAt: new Date(),
    },
  });
}

/** Find discoverable workers in a city, optionally filtered by skill keyword. */
export async function findAvailableWorkers(opts: {
  city?: string | null;
  skill?: string | null;
  excludeUserIds?: string[];
  limit?: number;
}) {
  const limit = opts.limit ?? 30;
  const where: any = { discoverable: true };
  if (opts.city) where.city = opts.city;
  if (opts.excludeUserIds && opts.excludeUserIds.length > 0) where.userId = { notIn: opts.excludeUserIds };
  const profiles = await prisma.workerProfile.findMany({
    where,
    include: { user: { select: { name: true, avatar: true } } },
    orderBy: [{ reputationScore: "desc" }, { totalShiftsCompleted: "desc" }],
    take: limit * 2,
  });
  if (opts.skill) {
    const k = opts.skill.toLowerCase();
    return profiles.filter((p) => (p.skills ?? "").toLowerCase().includes(k)).slice(0, limit);
  }
  return profiles.slice(0, limit);
}
