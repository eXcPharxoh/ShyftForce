// Visual merchandising tasks (retail). Endcap built? Window display set?
// Floor reset? Engine tracks completion + photo proof.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:               z.string().min(2).max(120),
  description:        z.string().max(1000).nullable().optional(),
  dueDate:            z.string().datetime().nullable().optional(),
  requirePhoto:       z.boolean().default(true),
  assignedToMemberId: z.string().nullable().optional(),
  locationId:         z.string().nullable().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // open | done | all
  const mine = url.searchParams.get("mine") === "1";

  const where: any = { organizationId: u.organizationId };
  if (status && status !== "all") where.status = status;
  if (mine && u.memberId) where.assignedToMemberId = u.memberId;
  if (u.role === "EMPLOYEE" && !mine) {
    // Employees see tasks assigned to them + unassigned tasks at their location
    where.OR = [{ assignedToMemberId: u.memberId ?? "" }, { assignedToMemberId: null }];
  }

  const items = await prisma.vmTask.findMany({
    where,
    include: {
      assignedTo: { include: { user: { select: { name: true } } } },
      submissions: { orderBy: { submittedAt: "desc" }, take: 1, include: { member: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 200,
  });

  return NextResponse.json({
    items: items.map(t => ({
      id: t.id, name: t.name, description: t.description,
      dueDate: t.dueDate, requirePhoto: t.requirePhoto,
      status: t.status,
      assignedToName: t.assignedTo?.user.name ?? null,
      assignedToMemberId: t.assignedToMemberId,
      lastSubmission: t.submissions[0] ? {
        memberName: t.submissions[0].member.user.name,
        photoData: t.submissions[0].photoData,
        notes: t.submissions[0].notes,
        submittedAt: t.submissions[0].submittedAt,
      } : null,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.assignedToMemberId) {
    const m = await prisma.member.findFirst({
      where: { id: parsed.data.assignedToMemberId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!m) return NextResponse.json({ error: "Member not in org" }, { status: 404 });
  }

  const t = await prisma.vmTask.create({
    data: {
      organizationId: u.organizationId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      requirePhoto: parsed.data.requirePhoto,
      assignedToMemberId: parsed.data.assignedToMemberId ?? null,
      locationId: parsed.data.locationId ?? null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "VmTask", entityId: t.id, metadata: { name: t.name },
  });
  return NextResponse.json({ ok: true, task: t });
}
