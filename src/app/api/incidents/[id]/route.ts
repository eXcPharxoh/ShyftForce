import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["open", "reviewing", "resolved", "escalated"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  resolutionNotes: z.string().max(8000).nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const r = await prisma.incidentReport.findFirst({
    where: { id, organizationId: u.organizationId, ...(isManager ? {} : { reportedById: u.memberId }) },
    include: {
      location: true,
      shift: { include: { location: true } },
      reportedBy: { include: { user: { select: { name: true, avatar: true } } } },
      reviewedBy: { include: { user: { select: { name: true } } } },
    },
  });
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(r);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const r = await prisma.incidentReport.findFirst({ where: { id, organizationId: u.organizationId } });
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const data: any = { ...parsed.data };
  if (parsed.data.status && parsed.data.status !== r.status) {
    data.reviewedById = u.memberId;
    data.reviewedAt = new Date();
  }
  const updated = await prisma.incidentReport.update({ where: { id }, data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "incident.update", entityType: "IncidentReport", entityId: id, metadata: parsed.data,
  });
  return NextResponse.json(updated);
}
