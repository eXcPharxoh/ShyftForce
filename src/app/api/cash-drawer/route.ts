// Cash drawer reconciliation. Open a session at the start of a cash-handling
// shift, close it at the end. We compute expected = open + cash sales -
// cash refunds (from POS) and a variance = close - expected.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const OpenSchema = z.object({
  locationId:     z.string().min(1),
  shiftId:        z.string().optional().nullable(),
  openCountCents: z.number().int().min(0).max(100_000_00), // up to $100K
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("location_id");
  const open = url.searchParams.get("open") === "1";

  const where: any = { organizationId: u.organizationId };
  if (locationId) where.locationId = locationId;
  if (open) where.closedAt = null;

  const sessions = await prisma.cashDrawerSession.findMany({
    where,
    include: { member: { include: { user: { select: { name: true } } } }, location: { select: { name: true } } },
    orderBy: { openedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    items: sessions.map(s => ({
      id: s.id, memberId: s.memberId, memberName: s.member.user.name,
      locationId: s.locationId, locationName: s.location.name,
      openedAt: s.openedAt, closedAt: s.closedAt,
      openCountCents: s.openCountCents,
      closeCountCents: s.closeCountCents,
      expectedCents: s.expectedCents,
      varianceCents: s.varianceCents,
      varianceReason: s.varianceReason,
      notes: s.notes,
    })),
  });
}

// Open a new session
export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = OpenSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const loc = await prisma.location.findFirst({
    where: { id: parsed.data.locationId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });

  // Refuse if the user already has an open session at this location
  const existing = await prisma.cashDrawerSession.findFirst({
    where: { memberId: u.memberId, locationId: parsed.data.locationId, closedAt: null },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "You already have an open cash drawer at this location. Close it first." }, { status: 409 });

  const session = await prisma.cashDrawerSession.create({
    data: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId,
      shiftId:        parsed.data.shiftId ?? null,
      memberId:       u.memberId,
      openCountCents: parsed.data.openCountCents,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "incident.create", entityType: "CashDrawerSession", entityId: session.id,
    metadata: { kind: "open", openCountCents: parsed.data.openCountCents, locationId: parsed.data.locationId },
  });

  return NextResponse.json({ ok: true, session });
}
