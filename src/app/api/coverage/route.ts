import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { detectNoShows } from "@/lib/marketplace/autopilot";

// GET /api/coverage
// Returns the live coverage state for the org's open shifts in the next N hours
// + a separate list of suspected no-shows.
export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const hoursAhead = Math.min(168, parseInt(url.searchParams.get("hours") ?? "48", 10));
  const now = new Date();
  const horizon = new Date(now.getTime() + hoursAhead * 3600_000);

  const openShifts = await prisma.shift.findMany({
    where: {
      isOpen: true,
      memberId: null,
      startsAt: { gte: now, lte: horizon },
      location: { organizationId: u.organizationId },
    },
    include: {
      location: true,
      openShiftOffers: { include: { member: { include: { user: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  const noShows = await detectNoShows({ organizationId: u.organizationId, now });

  return NextResponse.json({
    horizonHours: hoursAhead,
    openShifts: openShifts.map((s) => ({
      id: s.id,
      position: s.position,
      locationName: s.location.name,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      offers: s.openShiftOffers.map((o) => ({
        id: o.id,
        memberId: o.memberId,
        memberName: o.member.user.name,
        wave: o.wave,
        status: o.status,
        sentAt: o.sentAt,
        expiresAt: o.expiresAt,
        respondedAt: o.respondedAt,
        rationale: o.rationale,
      })),
    })),
    noShows,
  });
}
