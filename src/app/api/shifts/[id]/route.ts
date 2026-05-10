import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

function combine(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi]    = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const body = await req.json() as {
    date?: string; startTime?: string; endTime?: string;
    position?: string; notes?: string; status?: string;
    memberId?: string | null; isOpen?: boolean;
  };

  // Org check
  const existing = await prisma.shift.findUnique({ where: { id }, include: { location: true } });
  if (!existing || existing.location.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: any = {};
  if (body.date && body.startTime) {
    data.startsAt = combine(body.date, body.startTime);
    if (body.endTime) {
      let end = combine(body.date, body.endTime);
      if (end <= data.startsAt) end = new Date(end.getTime() + 24*3600*1000);
      data.endsAt = end;
    }
  }
  if (body.position !== undefined) data.position = body.position || null;
  if (body.notes !== undefined)    data.notes = body.notes || null;
  if (body.status && ["draft", "published"].includes(body.status)) data.status = body.status;
  if (body.memberId !== undefined) {
    data.memberId = body.memberId || null;
    data.isOpen = !body.memberId;
  }
  if (body.isOpen !== undefined) data.isOpen = body.isOpen;

  const updated = await prisma.shift.update({ where: { id }, data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "Shift", entityId: id, metadata: data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.shift.findUnique({ where: { id }, include: { location: true } });
  if (!existing || existing.location.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await prisma.shift.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.delete", entityType: "Shift", entityId: id,
  });
  return NextResponse.json({ ok: true });
}
