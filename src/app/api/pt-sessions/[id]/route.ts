import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  status: z.enum(["booked", "done", "no_show", "cancelled"]).optional(),
  notes:  z.string().max(500).nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.ptSession.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, trainerMemberId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.role === "EMPLOYEE" && existing.trainerMemberId !== u.memberId) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }

  const updated = await prisma.ptSession.update({ where: { id }, data: parsed.data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "PtSession", entityId: id, metadata: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const existing = await prisma.ptSession.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, trainerMemberId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.role === "EMPLOYEE" && existing.trainerMemberId !== u.memberId) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }
  await prisma.ptSession.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.delete", entityType: "PtSession", entityId: id });
  return NextResponse.json({ ok: true });
}
