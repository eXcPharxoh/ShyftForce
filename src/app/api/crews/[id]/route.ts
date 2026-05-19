import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name:      z.string().min(2).max(80).optional(),
  color:     z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  foremanId: z.string().nullable().optional(),
  active:    z.boolean().optional(),
}).strict();

const AddMemberSchema = z.object({
  memberId: z.string().min(1),
  role:     z.enum(["crew", "lead", "apprentice"]).default("crew"),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.crew.findFirst({
    where: { id, organizationId: u.organizationId }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.crew.update({ where: { id }, data: parsed.data });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "Crew", entityId: id, metadata: parsed.data });
  return NextResponse.json(updated);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = AddMemberSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const crew = await prisma.crew.findFirst({ where: { id, organizationId: u.organizationId }, select: { id: true } });
  if (!crew) return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  const m = await prisma.member.findFirst({ where: { id: parsed.data.memberId, organizationId: u.organizationId }, select: { id: true } });
  if (!m) return NextResponse.json({ error: "Member not in org" }, { status: 404 });

  const mem = await prisma.crewMembership.upsert({
    where: { crewId_memberId: { crewId: id, memberId: parsed.data.memberId } },
    create: { crewId: id, memberId: parsed.data.memberId, role: parsed.data.role },
    update: { role: parsed.data.role },
  });
  return NextResponse.json({ ok: true, membership: mem });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.crew.findFirst({ where: { id, organizationId: u.organizationId }, select: { id: true, name: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.crew.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "Crew", entityId: id, metadata: { deleted: existing.name } });
  return NextResponse.json({ ok: true });
}
