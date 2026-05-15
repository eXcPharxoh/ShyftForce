// Employees place a bid on an open shift to express interest. Priority lets
// them rank their preferences (1 = top choice). Manager sees demand heatmap
// + uses bids when auto-assigning.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const Schema = z.object({
  shiftId:  z.string().min(1),
  priority: z.number().int().min(1).max(99).default(1),
  note:     z.string().max(280).optional().nullable(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const shiftId = url.searchParams.get("shift_id");
  const mine = url.searchParams.get("mine") === "1";

  const where: any = {};
  if (shiftId) {
    // Org-scope: verify the shift is in user's org before exposing bids
    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, location: { organizationId: u.organizationId } },
      select: { id: true },
    });
    if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    where.shiftId = shiftId;
  } else {
    // Default to org-scoped via the shift relation
    where.shift = { location: { organizationId: u.organizationId } };
  }
  if (mine) where.memberId = u.memberId;

  const bids = await prisma.shiftBid.findMany({
    where,
    include: { member: { include: { user: { select: { name: true, avatar: true } } } } },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: 500,
  });
  return NextResponse.json({
    items: bids.map(b => ({
      id: b.id, shiftId: b.shiftId, memberId: b.memberId,
      memberName: b.member.user.name, memberAvatar: b.member.user.avatar,
      priority: b.priority, note: b.note, createdAt: b.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Cross-tenant: shift must be in user's org AND open
  const shift = await prisma.shift.findFirst({
    where: {
      id: parsed.data.shiftId,
      location: { organizationId: u.organizationId },
    },
    select: { id: true, isOpen: true, memberId: true, startsAt: true },
  });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  if (!shift.isOpen || shift.memberId) {
    return NextResponse.json({ error: "This shift isn't open for bidding" }, { status: 400 });
  }
  if (shift.startsAt < new Date()) {
    return NextResponse.json({ error: "Shift already started" }, { status: 400 });
  }

  const bid = await prisma.shiftBid.upsert({
    where:  { shiftId_memberId: { shiftId: parsed.data.shiftId, memberId: u.memberId } },
    create: { shiftId: parsed.data.shiftId, memberId: u.memberId, priority: parsed.data.priority, note: parsed.data.note ?? null },
    update: { priority: parsed.data.priority, note: parsed.data.note ?? null },
  });
  return NextResponse.json({ ok: true, bid });
}
