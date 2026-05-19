import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  status: z.enum(["open", "done", "overdue", "cancelled"]).optional(),
  assignedToMemberId: z.string().nullable().optional(),
}).strict();

const SubmitSchema = z.object({
  photoData: z.string().max(500_000).nullable().optional(),
  notes:     z.string().max(1000).nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.vmTask.findFirst({
    where: { id, organizationId: u.organizationId }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.vmTask.update({ where: { id }, data: parsed.data });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "VmTask", entityId: id, metadata: parsed.data });
  return NextResponse.json(updated);
}

// Submit a completion (employee can submit on tasks assigned to them)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const parsed = SubmitSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const task = await prisma.vmTask.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, assignedToMemberId: true, requirePhoto: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (u.role === "EMPLOYEE" && task.assignedToMemberId && task.assignedToMemberId !== u.memberId) {
    return NextResponse.json({ error: "Not assigned to you" }, { status: 403 });
  }
  if (task.requirePhoto && !parsed.data.photoData) {
    return NextResponse.json({ error: "Photo proof required" }, { status: 400 });
  }
  if (!u.memberId) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  await prisma.$transaction([
    prisma.vmTaskSubmission.create({
      data: {
        vmTaskId: id, memberId: u.memberId,
        photoData: parsed.data.photoData ?? null,
        notes: parsed.data.notes ?? null,
      },
    }),
    prisma.vmTask.update({ where: { id }, data: { status: "done" } }),
  ]);

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "VmTaskSubmission", entityId: id,
    metadata: { hasPhoto: !!parsed.data.photoData },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.vmTask.findFirst({
    where: { id, organizationId: u.organizationId }, select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.vmTask.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "VmTask", entityId: id, metadata: { deleted: existing.name } });
  return NextResponse.json({ ok: true });
}
