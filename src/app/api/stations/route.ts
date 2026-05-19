// Station / section assignment with fair-rotation suggestor.
//
// GET ?shift_id=<id>          → assignments for a single shift
// GET ?suggest=<station>&location=<id>&exclude_member_ids=... → ranked suggestion
//   based on who's worked this station LEAST in the last 30 days
// POST /api/stations          → upsert assignment for (shiftId, memberId)
// DELETE /api/stations/[id]   → remove assignment

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { addDays } from "@/lib/utils";

const UpsertSchema = z.object({
  shiftId:  z.string().min(1),
  memberId: z.string().min(1),
  station:  z.string().min(1).max(60),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const shiftId = url.searchParams.get("shift_id");
  const suggestStation = url.searchParams.get("suggest");
  const locationId = url.searchParams.get("location");

  // SUGGEST mode: fair-rotation ranking
  if (suggestStation && locationId) {
    // Verify location is in org
    const loc = await prisma.location.findFirst({
      where: { id: locationId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });

    const since = addDays(new Date(), -30);
    // Active members at this location
    const members = await prisma.member.findMany({
      where: { organizationId: u.organizationId, locationId, status: "active", role: { not: "ADMIN" } },
      include: {
        user: { select: { name: true } },
        stationAssignments: {
          where: { station: suggestStation, createdAt: { gte: since } },
          select: { id: true, createdAt: true },
        },
      },
    });

    // Rank: fewer recent assignments at this station = higher priority
    const ranked = members
      .map(m => ({
        memberId: m.id,
        name: m.user.name,
        recentCount: m.stationAssignments.length,
        lastAssignedAt: m.stationAssignments.sort((a, b) => +b.createdAt - +a.createdAt)[0]?.createdAt ?? null,
      }))
      .sort((a, b) => {
        if (a.recentCount !== b.recentCount) return a.recentCount - b.recentCount;
        // Tiebreaker: longest-ago last assignment
        const la = a.lastAssignedAt ? +a.lastAssignedAt : 0;
        const lb = b.lastAssignedAt ? +b.lastAssignedAt : 0;
        return la - lb;
      });

    return NextResponse.json({ station: suggestStation, ranked });
  }

  // Default: assignments for a shift
  if (!shiftId) return NextResponse.json({ error: "shift_id required" }, { status: 400 });
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, location: { organizationId: u.organizationId } },
    select: { id: true },
  });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  const items = await prisma.stationAssignment.findMany({
    where: { shiftId },
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { station: "asc" },
  });
  return NextResponse.json({
    items: items.map(a => ({ id: a.id, shiftId: a.shiftId, memberId: a.memberId, memberName: a.member.user.name, station: a.station, createdAt: a.createdAt })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = UpsertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Cross-tenant: shift + member must be in org
  const [shift, member] = await Promise.all([
    prisma.shift.findFirst({ where: { id: parsed.data.shiftId, location: { organizationId: u.organizationId } }, select: { id: true } }),
    prisma.member.findFirst({ where: { id: parsed.data.memberId, organizationId: u.organizationId }, select: { id: true } }),
  ]);
  if (!shift || !member) return NextResponse.json({ error: "Shift or member not in org" }, { status: 404 });

  const assignment = await prisma.stationAssignment.upsert({
    where: { shiftId_memberId: { shiftId: parsed.data.shiftId, memberId: parsed.data.memberId } },
    create: { shiftId: parsed.data.shiftId, memberId: parsed.data.memberId, station: parsed.data.station },
    update: { station: parsed.data.station },
  });
  return NextResponse.json({ ok: true, assignment });
}
