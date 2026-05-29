// Withdraw a bid (employee) OR award the shift to a bidder (manager).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { smsScheduleChange } from "@/lib/sms";
import { sendPush } from "@/lib/push";
import { memberHasExpiredBlockingPermit } from "@/lib/permits/service";
import { appUrl } from "@/lib/app-url";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  // Employees can withdraw their own bid; managers can withdraw any.
  const bid = await prisma.shiftBid.findFirst({
    where: { id, shift: { location: { organizationId: u.organizationId } } },
    select: { id: true, memberId: true },
  });
  if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (bid.memberId !== u.memberId && u.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.shiftBid.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

const AwardSchema = z.object({ action: z.literal("award") }).strict();

// POST = award the bid to its bidder (manager only). Atomically assigns the
// shift, closes it, supersedes other bids, and notifies the winner.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (u.role !== "ADMIN" && u.role !== "MANAGER") return NextResponse.json({ error: "Manager only" }, { status: 403 });

  const parsed = AwardSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { id } = await params;
  const bid = await prisma.shiftBid.findFirst({
    where: { id, shift: { location: { organizationId: u.organizationId } } },
    include: {
      shift: { include: { location: true } },
      member: { include: { user: true } },
    },
  });
  if (!bid) return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  if (!bid.shift.isOpen || bid.shift.memberId) {
    return NextResponse.json({ error: "Shift already filled" }, { status: 409 });
  }
  // Compliance block — refuse to award to an expired-permit guard
  if (await memberHasExpiredBlockingPermit(bid.memberId)) {
    return NextResponse.json({
      error: `${bid.member.user.name}'s permit is expired. Renew before awarding.`,
      blockedByPermit: true,
    }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    // Assign + close
    await tx.shift.update({
      where: { id: bid.shiftId },
      data: { memberId: bid.memberId, isOpen: false, status: "published" },
    });
    // Clear other bids on this shift
    await tx.shiftBid.deleteMany({ where: { shiftId: bid.shiftId, id: { not: id } } });
  });

  // Notify the winner (SMS + push, fire-and-forget)
  if (bid.member.phone) {
    smsScheduleChange({
      organizationId: u.organizationId,
      memberId: bid.memberId,
      phone: bid.member.phone,
      changeType: "added",
      position: bid.shift.position ?? "Shift",
      locationName: bid.shift.location.name,
      startsAt: bid.shift.startsAt,
      url: appUrl("/schedule"),
    }).catch(() => {});
  }
  sendPush(bid.member.userId, {
    title: "You got the shift 🎉",
    body: `${bid.shift.position ?? "Shift"} at ${bid.shift.location.name}`,
    url: "/schedule",
    tag: `shift-${bid.shiftId}`,
  }).catch(() => {});

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "Shift", entityId: bid.shiftId,
    metadata: { kind: "awarded_via_bid", winnerMemberId: bid.memberId, priority: bid.priority },
  });

  return NextResponse.json({ ok: true, winnerMemberName: bid.member.user.name });
}
