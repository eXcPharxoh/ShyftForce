// Hiring/ATS — job postings.
//   GET    → list org's postings (with application counts)
//   POST   → create new posting
//
// Each posting has a `publicToken` (uuid) used as the slug for the
// auth-free public apply page at /apply/[publicToken].

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  title:          z.string().min(2).max(120),
  description:    z.string().max(8000).optional().nullable(),
  position:       z.string().max(80).optional().nullable(),
  locationId:     z.string().optional().nullable(),
  payMin:         z.number().nonnegative().optional().nullable(),
  payMax:         z.number().nonnegative().optional().nullable(),
  payPeriod:      z.enum(["hour", "year", "week"]).default("hour"),
  employmentType: z.enum(["full_time", "part_time", "contract", "seasonal"]).default("part_time"),
  startDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status:         z.enum(["draft", "open"]).default("open"),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const postings = await prisma.jobPosting.findMany({
    where: { organizationId: u.organizationId },
    include: {
      location: { select: { name: true } },
      owner:    { include: { user: { select: { name: true } } } },
      _count:   { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Bucket counts by status for the pipeline chip on each card
  const ids = postings.map(p => p.id);
  const buckets = ids.length === 0 ? [] : await prisma.jobApplication.groupBy({
    by: ["jobPostingId", "status"],
    where: { jobPostingId: { in: ids } },
    _count: { _all: true },
  });

  const counts: Record<string, Record<string, number>> = {};
  for (const row of buckets) {
    counts[row.jobPostingId] ??= {};
    counts[row.jobPostingId][row.status] = row._count._all;
  }

  return NextResponse.json({
    items: postings.map(p => ({
      id: p.id,
      title: p.title,
      position: p.position,
      status: p.status,
      employmentType: p.employmentType,
      payMin: p.payMin, payMax: p.payMax, payPeriod: p.payPeriod,
      locationId: p.locationId,
      locationName: p.location?.name ?? null,
      ownerName: p.owner?.user.name ?? null,
      publicToken: p.publicToken,
      createdAt: p.createdAt.toISOString(),
      totalApplications: p._count.applications,
      byStatus: counts[p.id] ?? {},
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.payMin != null && parsed.data.payMax != null && parsed.data.payMax < parsed.data.payMin) {
    return NextResponse.json({ error: "Max pay must be >= min pay" }, { status: 400 });
  }

  if (parsed.data.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: parsed.data.locationId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });
  }

  const p = await prisma.jobPosting.create({
    data: {
      organizationId: u.organizationId,
      ownerId:        u.memberId ?? null,
      title:          parsed.data.title,
      description:    parsed.data.description ?? null,
      position:       parsed.data.position ?? null,
      locationId:     parsed.data.locationId ?? null,
      payMin:         parsed.data.payMin ?? null,
      payMax:         parsed.data.payMax ?? null,
      payPeriod:      parsed.data.payPeriod,
      employmentType: parsed.data.employmentType,
      startDate:      parsed.data.startDate ? new Date(parsed.data.startDate + "T00:00:00Z") : null,
      status:         parsed.data.status,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "JobPosting", entityId: p.id,
    metadata: { title: p.title, status: p.status },
  });
  return NextResponse.json({ ok: true, id: p.id, publicToken: p.publicToken });
}
