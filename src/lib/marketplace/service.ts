import { prisma } from "@/lib/prisma";
import { addDays, startOfWeek } from "@/lib/utils";
import { rankCandidates, WAVES, type RankedCandidate, type WavePlan } from "./ranker";
import { smsShiftOffer } from "@/lib/sms";
import { emitWebhook } from "@/lib/webhooks/emit";

export async function rankForShift(shiftId: string, organizationId: string, opts?: { excludeMemberIds?: string[] }) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { location: true },
  });
  if (!shift) throw new Error("Shift not found");
  if (shift.location.organizationId !== organizationId) throw new Error("Not in your org");

  const weekStart = startOfWeek(shift.startsAt);
  const weekEnd   = addDays(weekStart, 7);

  const candidates = await prisma.member.findMany({
    where: {
      organizationId,
      status: "active",
      role: { not: "ADMIN" },
      id: shift.memberId ? { not: shift.memberId } : undefined,
    },
    include: {
      user: true, location: true,
      shifts: { where: { startsAt: { gte: weekStart, lt: weekEnd }, OR: [{ status: "published" }, { status: "draft" }] } },
      timeOffRequests: { where: { status: "approved" } },
    },
  });

  const ranked = rankCandidates({
    shift: { id: shift.id, locationId: shift.locationId, position: shift.position, startsAt: shift.startsAt, endsAt: shift.endsAt },
    candidates: candidates.map(c => ({
      id: c.id, name: c.user.name, position: c.position, locationId: c.locationId,
      hourlyRate: c.hourlyRate,
      shiftsThisWeek: c.shifts.map(s => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt })),
      approvedTimeOff: c.timeOffRequests.map(t => ({ startsOn: t.startsOn, endsOn: t.endsOn })),
    })),
    excludeMemberIds: opts?.excludeMemberIds,
  });

  return { shift, ranked };
}

/** Send offers + DM each candidate. Returns the offer records. */
export async function sendOffers(opts: {
  shiftId: string;
  organizationId: string;
  fromMemberId: string;
  candidates: { memberId: string; rationale?: string }[];
  wave: 1 | 2 | 3;
}) {
  const plan: WavePlan = WAVES[opts.wave];
  const expiresAt = new Date(Date.now() + plan.expiryHours * 3600 * 1000);

  const shift = await prisma.shift.findUnique({
    where: { id: opts.shiftId },
    include: { location: true },
  });
  if (!shift) throw new Error("Shift not found");

  // Look up member phone numbers once so we can SMS in parallel
  const memberIds = opts.candidates.map(c => c.memberId);
  const memberPhones = await prisma.member.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, phone: true },
  });
  const phoneByMemberId = new Map(memberPhones.map(m => [m.id, m.phone]));

  const offers: any[] = [];
  const startStr = shift.startsAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const endStr   = shift.endsAt.toLocaleTimeString("en-US",  { hour: "numeric", minute: "2-digit" });

  for (const cand of opts.candidates) {
    const upserted = await prisma.openShiftOffer.upsert({
      where: { shiftId_memberId: { shiftId: opts.shiftId, memberId: cand.memberId } },
      create: { shiftId: opts.shiftId, memberId: cand.memberId, wave: opts.wave, expiresAt, rationale: cand.rationale },
      update: { wave: opts.wave, status: "pending", expiresAt, sentAt: new Date(), respondedAt: null, rationale: cand.rationale },
    });
    offers.push(upserted);
    // In-app DM
    await prisma.message.create({
      data: {
        fromId: opts.fromMemberId,
        toId:   cand.memberId,
        body: `📅 Shift offered: ${shift.position ?? "shift"} at ${shift.location.name}, ${startStr}–${endStr}. First to claim wins → /open-shifts`,
      },
    });
    // SMS the candidate (fire-and-forget; respects opt-in + quiet hours)
    const phone = phoneByMemberId.get(cand.memberId);
    if (phone) {
      smsShiftOffer({
        organizationId: opts.organizationId,
        memberId: cand.memberId,
        phone,
        position: shift.position ?? "Shift",
        locationName: shift.location.name,
        startsAt: shift.startsAt,
        expiresAt,
        offerUrl: "https://app.shyftforce.com/open-shifts",
      }).catch(() => {});
    }
  }
  // Fire-and-forget webhook for any customer integrations watching shift offers
  emitWebhook({
    organizationId: opts.organizationId,
    event: "shift.published",
    data: { shiftId: opts.shiftId, wave: opts.wave, offered: offers.length, locationId: shift.locationId, startsAt: shift.startsAt },
  }).catch(() => {});
  return offers;
}

/** Atomic claim. First-write-wins. Marks shift as taken + supersedes other pending offers. */
export async function claimShift(shiftId: string, memberId: string, organizationId: string) {
  return await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({ where: { id: shiftId }, include: { location: true } });
    if (!shift) throw new Error("Shift not found");
    if (shift.location.organizationId !== organizationId) throw new Error("Not in your org");
    if (!shift.isOpen || shift.memberId) throw new Error("This shift was already claimed");

    // Try to claim — only succeeds if still open
    const updated = await tx.shift.updateMany({
      where: { id: shiftId, isOpen: true, memberId: null },
      data:  { isOpen: false, memberId, status: "published" },
    });
    if (updated.count === 0) throw new Error("Beaten to it — someone else just claimed this shift");

    // Mark this offer claimed (if existed)
    await tx.openShiftOffer.updateMany({
      where: { shiftId, memberId, status: "pending" },
      data:  { status: "claimed", respondedAt: new Date() },
    });
    // Supersede the rest
    await tx.openShiftOffer.updateMany({
      where: { shiftId, status: "pending", memberId: { not: memberId } },
      data:  { status: "superseded", respondedAt: new Date() },
    });

    return await tx.shift.findUnique({ where: { id: shiftId }, include: { location: true, member: { include: { user: true } } } });
  });
}
