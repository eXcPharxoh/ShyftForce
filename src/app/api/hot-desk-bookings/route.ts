// Book a desk for a given date. Half-day (am/pm/full) supported.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  hotDeskId: z.string().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  halfDay:   z.enum(["am", "pm", "full"]).default("full"),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  if (!u.memberId) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const desk = await prisma.hotDesk.findFirst({
    where: { id: parsed.data.hotDeskId, organizationId: u.organizationId, active: true },
    select: { id: true, name: true },
  });
  if (!desk) return NextResponse.json({ error: "Desk not available" }, { status: 404 });

  try {
    const b = await prisma.hotDeskBooking.create({
      data: {
        hotDeskId: parsed.data.hotDeskId,
        memberId:  u.memberId,
        date:      new Date(parsed.data.date + "T00:00:00Z"),
        halfDay:   parsed.data.halfDay,
      },
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "shift.create", entityType: "HotDeskBooking", entityId: b.id,
      metadata: { deskName: desk.name, date: parsed.data.date, halfDay: parsed.data.halfDay },
    });
    return NextResponse.json({ ok: true, booking: b });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Desk already booked for that time" }, { status: 409 });
    throw e;
  }
}

const DeleteSchema = z.object({ id: z.string().min(1) }).strict();
export async function DELETE(req: Request) {
  const u = await requireUser();
  const parsed = DeleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const b = await prisma.hotDeskBooking.findFirst({
    where: { id: parsed.data.id, hotDesk: { organizationId: u.organizationId } },
    select: { id: true, memberId: true },
  });
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.role === "EMPLOYEE" && b.memberId !== u.memberId) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }
  await prisma.hotDeskBooking.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
