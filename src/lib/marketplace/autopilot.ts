// Self-Healing Schedule autopilot:
//  - openShiftForCover: marks an assigned shift open + fires wave 1
//  - tickAutopilot:    expires stale offers, advances waves, escalates at last wave
//  - detectNoShows:    surfaces shifts that started without a clock-in
//
// All public functions take an organizationId so they can be called from
// per-org user routes OR from a cron route that iterates orgs.

import { prisma } from "@/lib/prisma";
import { rankForShift, sendOffers } from "./service";
import { WAVES } from "./ranker";

const SYSTEM_FROM_FALLBACK = "system"; // resolved to first ADMIN/MANAGER member at runtime

async function systemMessenger(organizationId: string): Promise<string> {
  // Pick the first manager/admin member to attribute system DMs to (Message.fromId is required).
  const m = await prisma.member.findFirst({
    where: { organizationId, role: { in: ["ADMIN", "MANAGER"] }, status: "active" },
    orderBy: { role: "asc" },
  });
  if (!m) throw new Error("No manager/admin in org to send system DM as");
  return m.id;
}

/**
 * Flip an assigned shift to "open" (releases the member) and fire wave 1 offers.
 * Used by employee call-out and manager one-tap "Find cover".
 */
export async function openShiftForCover(opts: {
  shiftId: string;
  organizationId: string;
  reason: "called_out" | "manager_open" | "no_show";
  triggeredByMemberId: string;
}) {
  const shift = await prisma.shift.findUnique({
    where: { id: opts.shiftId },
    include: { location: true, member: { include: { user: true } } },
  });
  if (!shift) throw new Error("Shift not found");
  if (shift.location.organizationId !== opts.organizationId) throw new Error("Not in your org");

  const previousMemberId = shift.memberId;

  // Atomically release the shift if it's still assigned + not already open
  await prisma.$transaction(async (tx) => {
    if (!shift.isOpen) {
      await tx.shift.update({
        where: { id: opts.shiftId },
        data: { isOpen: true, memberId: null, status: "published" },
      });
    }
    // Wipe any stale offers from a previous coverage run on this shift
    await tx.openShiftOffer.updateMany({
      where: { shiftId: opts.shiftId, status: "pending" },
      data: { status: "superseded", respondedAt: new Date() },
    });
  });

  // Build the candidate list (excluding the person who just dropped it)
  const fromMemberId = await systemMessenger(opts.organizationId);
  const { ranked } = await rankForShift(opts.shiftId, opts.organizationId, {
    excludeMemberIds: previousMemberId ? [previousMemberId] : [],
  });
  const wave1 = ranked.slice(0, WAVES[1].size);

  let offersSent = 0;
  if (wave1.length > 0) {
    const offers = await sendOffers({
      shiftId: opts.shiftId,
      organizationId: opts.organizationId,
      fromMemberId,
      candidates: wave1.map((c) => ({ memberId: c.id, rationale: c.rationale })),
      wave: 1,
    });
    offersSent = offers.length;
  }

  // DM the org's managers (excluding the trigger if they're a manager)
  const managers = await prisma.member.findMany({
    where: { organizationId: opts.organizationId, role: { in: ["ADMIN", "MANAGER"] }, status: "active" },
  });
  const reasonLabel: Record<string, string> = {
    called_out: `${shift.member?.user.name ?? "An employee"} called out`,
    manager_open: "Shift opened for cover",
    no_show: `${shift.member?.user.name ?? "Assigned employee"} did not clock in`,
  };
  const startStr = shift.startsAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  // Single batch insert instead of N sequential creates — at 30 managers
  // the prior loop was 30 round-trips to Neon per shift opening, which
  // dominated the request time on bigger orgs.
  const body = `🚨 Coverage needed · ${shift.location.name} · ${startStr}. ${reasonLabel[opts.reason]}. Auto-offered to top ${offersSent} → /schedule/coverage`;
  const recipients = managers
    .filter(mgr => !(mgr.id === fromMemberId && mgr.id === opts.triggeredByMemberId))
    .map(mgr => ({ fromId: fromMemberId, toId: mgr.id, body }));
  if (recipients.length > 0) {
    await prisma.message.createMany({ data: recipients });
  }

  return { offersSent, releasedMemberId: previousMemberId };
}

/**
 * Walk every open shift in the org with in-flight offers:
 *  1. expire offers past their TTL
 *  2. for shifts where the latest wave is fully exhausted (all expired/declined/superseded)
 *     and there's still time to fill, send the next wave
 *  3. for shifts at the last wave with no claim, DM managers to escalate
 *
 * Returns a summary so the caller can render or log it.
 */
export async function tickAutopilot(opts: { organizationId: string; now?: Date }) {
  const now = opts.now ?? new Date();
  const fromMemberId = await systemMessenger(opts.organizationId);

  // 1) Expire any pending offers whose TTL passed
  const expiredRes = await prisma.openShiftOffer.updateMany({
    where: {
      status: "pending",
      expiresAt: { lt: now },
      shift: { location: { organizationId: opts.organizationId } },
    },
    data: { status: "expired", respondedAt: now },
  });

  // 2) Find every shift in this org that is still open + has at least one offer history
  const openShifts = await prisma.shift.findMany({
    where: {
      isOpen: true,
      memberId: null,
      startsAt: { gt: now }, // can't auto-cover a shift that already started — that's escalation territory
      location: { organizationId: opts.organizationId },
    },
    include: { location: true, openShiftOffers: true },
  });

  let advanced = 0;
  let escalated = 0;
  for (const s of openShifts) {
    if (s.openShiftOffers.length === 0) continue; // never been auto-offered → leave alone
    const lastWave = Math.max(0, ...s.openShiftOffers.map((o) => o.wave));
    const pendingInLastWave = s.openShiftOffers.some((o) => o.wave === lastWave && o.status === "pending");
    const claimed = s.openShiftOffers.some((o) => o.status === "claimed");
    if (claimed || pendingInLastWave) continue;

    if (lastWave < 3) {
      const nextWave = (lastWave + 1) as 1 | 2 | 3;
      const previouslyOfferedIds = s.openShiftOffers.map((o) => o.memberId);
      const { ranked } = await rankForShift(s.id, opts.organizationId);
      const fresh = ranked.filter((c) => !previouslyOfferedIds.includes(c.id)).slice(0, WAVES[nextWave].size);
      if (fresh.length === 0) {
        // Nobody left to offer — escalate
        await escalateToManagers(opts.organizationId, fromMemberId, s, "exhausted");
        escalated++;
        continue;
      }
      await sendOffers({
        shiftId: s.id,
        organizationId: opts.organizationId,
        fromMemberId,
        candidates: fresh.map((c) => ({ memberId: c.id, rationale: c.rationale })),
        wave: nextWave,
      });
      advanced++;
    } else {
      // Already at wave 3 with everyone exhausted → escalate
      await escalateToManagers(opts.organizationId, fromMemberId, s, "wave3_done");
      escalated++;
    }
  }

  return { expired: expiredRes.count, advanced, escalated, openShifts: openShifts.length };
}

async function escalateToManagers(
  organizationId: string,
  fromMemberId: string,
  shift: { id: string; locationId: string; startsAt: Date; location: { name: string } },
  kind: "exhausted" | "wave3_done"
) {
  const managers = await prisma.member.findMany({
    where: { organizationId, role: { in: ["ADMIN", "MANAGER"] }, status: "active" },
  });
  const startStr = shift.startsAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const tag = kind === "wave3_done" ? "All 3 waves exhausted" : "No remaining eligible candidates";
  const body = `🛑 Coverage escalation · ${shift.location.name} · ${startStr}. ${tag}. Manual action needed → /schedule/coverage`;
  if (managers.length > 0) {
    await prisma.message.createMany({
      data: managers.map(mgr => ({ fromId: fromMemberId, toId: mgr.id, body })),
    });
  }
}

/**
 * Detect shifts that started ≥ graceMinutes ago whose assigned member never clocked in.
 * Returns candidates for "no-show" handling — does NOT auto-cover (manager confirms).
 */
export async function detectNoShows(opts: { organizationId: string; graceMinutes?: number; now?: Date }) {
  const now = opts.now ?? new Date();
  const grace = opts.graceMinutes ?? 15;
  const cutoff = new Date(now.getTime() - grace * 60_000);

  // Shifts that were assigned + scheduled to have started already
  const candidates = await prisma.shift.findMany({
    where: {
      memberId: { not: null },
      isOpen: false,
      startsAt: { lte: cutoff, gt: new Date(now.getTime() - 12 * 3600_000) }, // started within last 12h
      endsAt: { gt: now }, // shift hasn't fully ended yet
      location: { organizationId: opts.organizationId },
    },
    include: { location: true, member: { include: { user: true } } },
  });
  if (candidates.length === 0) return [];

  const memberIds = candidates.map((s) => s.memberId!) as string[];
  const clockIns = await prisma.attendanceLog.findMany({
    where: {
      memberId: { in: memberIds },
      type: "clock_in",
      at: { gte: new Date(now.getTime() - 12 * 3600_000), lte: now },
    },
    select: { memberId: true, at: true },
  });

  return candidates
    .filter((s) => {
      const hits = clockIns.filter((c) => c.memberId === s.memberId);
      // Consider clocked-in if any clock_in occurred from -30min before start until now
      const window = new Date(s.startsAt.getTime() - 30 * 60_000);
      return !hits.some((h) => h.at >= window);
    })
    .map((s) => ({
      shiftId: s.id,
      memberId: s.memberId!,
      memberName: s.member?.user.name ?? "Unknown",
      locationName: s.location.name,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      minutesLate: Math.floor((+now - +s.startsAt) / 60_000),
    }));
}
