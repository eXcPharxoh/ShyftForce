import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name:   z.string().min(2).max(80).optional(),
  color:  z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  active: z.boolean().optional(),
  notes:  z.string().max(500).nullable().optional(),
  minStaffByHour: z.string().max(4000).nullable().optional(), // JSON string
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.department.findFirst({
    where: { id, organizationId: u.organizationId }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.department.update({ where: { id }, data: parsed.data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Department", entityId: id, metadata: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.department.findFirst({
    where: { id, organizationId: u.organizationId }, select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.department.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Department", entityId: id, metadata: { deleted: existing.name },
  });
  return NextResponse.json({ ok: true });
}

// Toggle member membership (POST attach, DELETE detach via body)
const MembershipSchema = z.object({
  memberId: z.string().min(1),
  isPrimary: z.boolean().optional(),
}).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = MembershipSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const dept = await prisma.department.findFirst({
    where: { id, organizationId: u.organizationId }, select: { id: true },
  });
  if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });
  const member = await prisma.member.findFirst({
    where: { id: parsed.data.memberId, organizationId: u.organizationId }, select: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Member not in org" }, { status: 404 });

  const m = await prisma.departmentMembership.upsert({
    where: { departmentId_memberId: { departmentId: id, memberId: parsed.data.memberId } },
    create: { departmentId: id, memberId: parsed.data.memberId, isPrimary: parsed.data.isPrimary ?? false },
    update: { isPrimary: parsed.data.isPrimary ?? false },
  });
  return NextResponse.json({ ok: true, membership: m });
}
