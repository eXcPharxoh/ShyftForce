import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";
import { audit } from "@/lib/audit";

const Schema = z.object({
  shiftId:       z.string(),
  targetMemberId: z.string(),
  targetShiftId: z.string().optional().nullable(),  // mutual swap
  message:       z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const items = await prisma.shiftSwapRequest.findMany({
    where: {
      OR: [{ requesterId: u.memberId }, { targetId: u.memberId }],
      ...(status ? { status } : {}),
    },
    include: {
      shift:     { include: { location: true } },
      requester: { include: { user: true } },
      target:    { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const shift = await prisma.shift.findUnique({ where: { id: parsed.data.shiftId }, include: { location: true } });
  if (!shift || shift.location.organizationId !== u.organizationId) return NextResponse.json({ error: "shift not found" }, { status: 404 });
  if (shift.memberId !== u.memberId) return NextResponse.json({ error: "you don't own this shift" }, { status: 403 });
  if (parsed.data.targetMemberId === u.memberId) return NextResponse.json({ error: "can't swap with yourself" }, { status: 400 });

  const target = await prisma.member.findUnique({ where: { id: parsed.data.targetMemberId } });
  if (!target || target.organizationId !== u.organizationId) return NextResponse.json({ error: "target not in org" }, { status: 404 });

  const r = await prisma.shiftSwapRequest.create({
    data: {
      shiftId:       parsed.data.shiftId,
      requesterId:   u.memberId,
      targetId:      parsed.data.targetMemberId,
      targetShiftId: parsed.data.targetShiftId ?? null,
      message:       parsed.data.message ?? null,
    },
  });

  // DM the target
  await prisma.message.create({
    data: {
      fromId: u.memberId, toId: parsed.data.targetMemberId,
      body: `🔁 Shift swap requested: ${shift.location.name} on ${shift.startsAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ${shift.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. View in /open-shifts.`,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "ShiftSwapRequest", entityId: r.id,
    metadata: { shiftId: parsed.data.shiftId, targetId: parsed.data.targetMemberId },
  });

  return NextResponse.json(r);
}
