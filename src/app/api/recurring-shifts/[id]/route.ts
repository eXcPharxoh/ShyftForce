import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const data = await req.json();
  const allowed = ["dayOfWeek", "startTime", "endTime", "position", "active", "effectiveUntil", "locationId"] as const;
  const update: any = {};
  for (const k of allowed) if (k in data) update[k] = k === "effectiveUntil" && data[k] ? new Date(data[k]) : data[k];

  const existing = await prisma.recurringShift.findUnique({ where: { id }, include: { member: true } });
  if (!existing || existing.member.organizationId !== u.organizationId) return NextResponse.json({ error: "not found" }, { status: 404 });
  const r = await prisma.recurringShift.update({ where: { id }, data: update });
  return NextResponse.json(r);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.recurringShift.findUnique({ where: { id }, include: { member: true } });
  if (!existing || existing.member.organizationId !== u.organizationId) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.recurringShift.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.delete", entityType: "RecurringShift", entityId: id });
  return NextResponse.json({ ok: true });
}
