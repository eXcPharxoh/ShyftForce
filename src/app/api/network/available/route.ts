import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getOrCreateWorkerProfile } from "@/lib/network/profile";

// GET /api/network/available — list of network shifts visible to the current user.
// Visible if: (a) directly invited, OR (b) open + worker is discoverable.
export async function GET() {
  const u = await requireUser();
  const profile = await getOrCreateWorkerProfile(u.id);
  const now = new Date();

  const offers = await prisma.networkShiftOffer.findMany({
    where: {
      status: "open",
      shift: { startsAt: { gt: now } },
      OR: [
        { invitedWorkerId: profile.id },
        {
          AND: [
            { invitedWorkerId: null },
            // Discoverable workers see all open posts
            ...(profile.discoverable ? [{}] : [{ id: "__none__" }]), // if not discoverable + not invited, show none
          ],
        },
      ],
      // Don't show the worker's own employer's posts
      postingOrgId: { not: u.organizationId },
    },
    include: {
      shift: { include: { location: true } },
      postingOrg: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    discoverable: profile.discoverable,
    offers: offers.map((o) => ({
      id: o.id,
      shiftId: o.shiftId,
      payoutType: o.payoutType,
      payRateOverrideCents: o.payRateOverrideCents,
      message: o.message,
      directlyInvited: o.invitedWorkerId === profile.id,
      postingOrg: o.postingOrg,
      shift: {
        id: o.shift.id,
        startsAt: o.shift.startsAt,
        endsAt: o.shift.endsAt,
        position: o.shift.position,
        locationName: o.shift.location.name,
      },
    })),
  });
}
