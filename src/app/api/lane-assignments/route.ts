// Assign a cashier to a lane for a shift.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const Schema = z.object({
  shiftId:  z.string().min(1),
  laneId:   z.string().min(1),
  memberId: z.string().min(1),
  fromMin:  z.number().int().min(0).max(1440).nullable().optional(),
  toMin:    z.number().int().min(0).max(1440).nullable().optional(),
}).strict();

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [shift, lane, member] = await Promise.all([
    prisma.shift.findFirst({ where: { id: parsed.data.shiftId, location: { organizationId: u.organizationId } }, select: { id: true, memberId: true } }),
    prisma.posLane.findFirst({ where: { id: parsed.data.laneId, organizationId: u.organizationId, active: true }, select: { id: true } }),
    prisma.member.findFirst({ where: { id: parsed.data.memberId, organizationId: u.organizationId }, select: { id: true } }),
  ]);
  if (!shift)  return NextResponse.json({ error: "Shift not in org" }, { status: 404 });
  if (!lane)   return NextResponse.json({ error: "Lane not active or not in org" }, { status: 404 });
  if (!member) return NextResponse.json({ error: "Member not in org" }, { status: 404 });
  if (shift.memberId && shift.memberId !== parsed.data.memberId) {
    return NextResponse.json({ error: "Lane assignee must match shift's assigned member" }, { status: 400 });
  }

  const a = await prisma.laneAssignment.upsert({
    where: { shiftId: parsed.data.shiftId },
    create: {
      shiftId: parsed.data.shiftId, laneId: parsed.data.laneId, memberId: parsed.data.memberId,
      fromMin: parsed.data.fromMin ?? null, toMin: parsed.data.toMin ?? null,
    },
    update: { laneId: parsed.data.laneId, memberId: parsed.data.memberId, fromMin: parsed.data.fromMin ?? null, toMin: parsed.data.toMin ?? null },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "LaneAssignment", entityId: a.id,
    metadata: { shiftId: parsed.data.shiftId, laneId: parsed.data.laneId },
  });
  return NextResponse.json({ ok: true, assignment: a });
}
