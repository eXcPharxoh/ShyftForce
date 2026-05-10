import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getOrCreateWorkerProfile, recomputeReputation } from "@/lib/network/profile";
import { audit } from "@/lib/audit";

// POST /api/network/claim/:id — worker claims a network shift offer.
// On claim: NetworkShiftOffer.status = claimed; the underlying Shift gets
// externalWorkerProfileId set + memberId stays null (worker is not a member of
// posting org). Posting org sees the worker's profile + can DM via the
// internal_ledger out-of-band (real implementation would create a temporary
// guest member record).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const profile = await getOrCreateWorkerProfile(u.id);

  const result = await prisma.$transaction(async (tx) => {
    const offer = await tx.networkShiftOffer.findUnique({
      where: { id },
      include: { shift: { include: { location: true } }, postingOrg: true },
    });
    if (!offer) throw new Error("offer not found");
    if (offer.status !== "open") throw new Error("offer no longer available");
    if (offer.invitedWorkerId && offer.invitedWorkerId !== profile.id) throw new Error("this offer is reserved for another worker");
    if (!offer.invitedWorkerId && !profile.discoverable) throw new Error("turn on discoverability to claim open network shifts");
    if (offer.postingOrgId === u.organizationId) throw new Error("can't claim your own employer's posts");
    if (offer.shift.endsAt < new Date()) throw new Error("shift already ended");

    // Atomic claim — race-safe via updateMany with status condition
    const updated = await tx.networkShiftOffer.updateMany({
      where: { id, status: "open" },
      data: { status: "claimed", claimedById: profile.id, claimedAt: new Date(), closedAt: new Date() },
    });
    if (updated.count === 0) throw new Error("beaten to it — someone else just claimed this shift");

    // Mark the underlying Shift as filled by an external worker
    await tx.shift.update({
      where: { id: offer.shiftId },
      data: { isOpen: false, externalWorkerProfileId: profile.id, status: "published" },
    });

    // DM the posting manager via the existing Message system isn't direct (different org),
    // so we record an audit log + return the contact info for the manager UI to surface.
    return offer;
  });

  // Fire-and-forget reputation refresh
  recomputeReputation(profile.id).catch((e) => console.error("reputation recompute failed:", e));

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "network.claim", entityType: "NetworkShiftOffer", entityId: id,
    metadata: { shiftId: result.shiftId, postingOrgId: result.postingOrgId },
  });

  return NextResponse.json({ ok: true, offerId: id, shiftId: result.shiftId });
}
