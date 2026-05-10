import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { rankForShift, sendOffers } from "@/lib/marketplace/service";
import { WAVES } from "@/lib/marketplace/ranker";

// GET /api/shifts/:id/auto-offer  → preview ranked candidates (no offers sent yet)
// POST /api/shifts/:id/auto-offer → send offers; body { wave?: 1, candidateIds?: string[] }
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const { shift, ranked } = await rankForShift(id, u.organizationId);
  return NextResponse.json({ shift: { id: shift.id, position: shift.position, locationId: shift.locationId }, candidates: ranked });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const body = await req.json() as { wave?: 1 | 2 | 3; candidateIds?: string[] };
  const wave = (body.wave ?? 1) as 1 | 2 | 3;
  const plan = WAVES[wave];

  // Exclude anyone who's already accepted/claimed elsewhere this week
  const previouslyOffered = await prisma.openShiftOffer.findMany({ where: { shiftId: id, status: { in: ["pending", "declined", "expired", "superseded"] } } });
  const previouslyOfferedIds = previouslyOffered.map(o => o.memberId);

  const { ranked } = await rankForShift(id, u.organizationId);
  // Mark already-offered candidates so the rationale notes it
  const annotated = ranked.map(c => ({ ...c, alreadyOffered: previouslyOfferedIds.includes(c.id) }));

  let chosen = annotated;
  if (body.candidateIds && body.candidateIds.length > 0) {
    chosen = annotated.filter(c => body.candidateIds!.includes(c.id));
  } else {
    // Default: take the top N for this wave who haven't been offered yet
    chosen = annotated.filter(c => !c.alreadyOffered).slice(0, plan.size);
  }

  if (chosen.length === 0) return NextResponse.json({ sent: 0, message: "No new candidates to offer." });

  const offers = await sendOffers({
    shiftId: id, organizationId: u.organizationId, fromMemberId: u.memberId, wave,
    candidates: chosen.map(c => ({ memberId: c.id, rationale: c.rationale })),
  });

  return NextResponse.json({
    sent: offers.length,
    wave, expiresAt: offers[0].expiresAt,
    offered: chosen.map(c => ({ id: c.id, name: c.name, score: c.score, rationale: c.rationale })),
  });
}
