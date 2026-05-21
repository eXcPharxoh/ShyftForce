// Single job posting: PATCH (status / fields) + DELETE (only if no applications).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  title:          z.string().min(2).max(120).optional(),
  description:    z.string().max(8000).nullable().optional(),
  position:       z.string().max(80).nullable().optional(),
  locationId:     z.string().nullable().optional(),
  payMin:         z.number().nonnegative().nullable().optional(),
  payMax:         z.number().nonnegative().nullable().optional(),
  payPeriod:      z.enum(["hour", "year", "week"]).optional(),
  employmentType: z.enum(["full_time", "part_time", "contract", "seasonal"]).optional(),
  startDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status:         z.enum(["draft", "open", "closed"]).optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.jobPosting.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  for (const k of ["title", "description", "position", "locationId", "payMin", "payMax", "payPeriod", "employmentType"] as const) {
    if (parsed.data[k] !== undefined) data[k] = parsed.data[k];
  }
  if (parsed.data.startDate !== undefined) {
    data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate + "T00:00:00Z") : null;
  }
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    if (parsed.data.status === "closed" && existing.status !== "closed") data.closedAt = new Date();
    if (parsed.data.status !== "closed" && existing.status === "closed")  data.closedAt = null;
  }

  await prisma.jobPosting.update({ where: { id }, data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "JobPosting", entityId: id,
    metadata: { fields: Object.keys(data) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.jobPosting.findFirst({
    where: { id, organizationId: u.organizationId },
    include: { _count: { select: { applications: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing._count.applications > 0) {
    return NextResponse.json({
      error: "Posting has applications. Close it instead — that hides it from /apply while keeping the candidate history.",
    }, { status: 409 });
  }
  await prisma.jobPosting.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "JobPosting", entityId: id,
    metadata: { deleted: existing.title },
  });
  return NextResponse.json({ ok: true });
}
