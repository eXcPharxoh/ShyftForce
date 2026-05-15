import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { PERMISSION_CATALOG } from "@/lib/permissions";

const PatchSchema = z.object({
  name:        z.string().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  permissions: z.array(z.enum(PERMISSION_CATALOG.map(p => p.key) as any)).optional(),
}).strict();

const AssignSchema = z.object({
  memberId: z.string().min(1),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  if (u.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.customRole.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  if (parsed.data.name        !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.permissions !== undefined) data.permissions = JSON.stringify(parsed.data.permissions);

  const updated = await prisma.customRole.update({ where: { id }, data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "CustomRole", entityId: id, metadata: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  if (u.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.customRole.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.customRole.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "CustomRole", entityId: id, metadata: { deleted: existing.name },
  });
  return NextResponse.json({ ok: true });
}

// POST /api/custom-roles/[id]  body: { memberId } → assign
// DELETE /api/custom-roles/[id]/member/[memberId] → unassign  (see sibling route)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  if (u.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const parsed = AssignSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Verify both role + member belong to this org
  const [role, member] = await Promise.all([
    prisma.customRole.findFirst({ where: { id, organizationId: u.organizationId }, select: { id: true } }),
    prisma.member.findFirst({ where: { id: parsed.data.memberId, organizationId: u.organizationId }, select: { id: true } }),
  ]);
  if (!role || !member) return NextResponse.json({ error: "Role or member not in this org" }, { status: 404 });

  await prisma.memberRoleAssignment.upsert({
    where: { memberId_customRoleId: { memberId: parsed.data.memberId, customRoleId: id } },
    create: { memberId: parsed.data.memberId, customRoleId: id },
    update: {},
  });
  return NextResponse.json({ ok: true });
}
