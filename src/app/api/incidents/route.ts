import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  locationId: z.string().nullable().optional(),
  shiftId: z.string().nullable().optional(),
  occurredAt: z.string(),
  category: z.enum(["theft", "trespass", "medical", "altercation", "property_damage", "policy_violation", "safety", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]).default("low"),
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(8000),
  witnessNames: z.string().max(500).nullable().optional(),
  photoData: z.string().max(500_000).nullable().optional(), // ~500KB base64
  policeReportNo: z.string().max(120).nullable().optional(),
});

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const locationId = url.searchParams.get("location");
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const where: any = { organizationId: u.organizationId };
  if (!isManager) where.reportedById = u.memberId; // employees see their own only
  if (status) where.status = status;
  if (locationId) where.locationId = locationId;

  const items = await prisma.incidentReport.findMany({
    where,
    include: {
      location: true,
      reportedBy: { include: { user: { select: { name: true, avatar: true } } } },
      reviewedBy: { include: { user: { select: { name: true } } } },
    },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.locationId) {
    const loc = await prisma.location.findFirst({ where: { id: parsed.data.locationId, organizationId: u.organizationId } });
    if (!loc) return NextResponse.json({ error: "location not in org" }, { status: 404 });
  }

  const created = await prisma.incidentReport.create({
    data: {
      organizationId: u.organizationId,
      locationId: parsed.data.locationId ?? null,
      shiftId: parsed.data.shiftId ?? null,
      reportedById: u.memberId,
      occurredAt: new Date(parsed.data.occurredAt),
      category: parsed.data.category,
      severity: parsed.data.severity,
      title: parsed.data.title,
      body: parsed.data.body,
      witnessNames: parsed.data.witnessNames ?? null,
      photoData: parsed.data.photoData ?? null,
      policeReportNo: parsed.data.policeReportNo ?? null,
    },
  });

  // DM all managers on critical/high incidents
  if (parsed.data.severity === "critical" || parsed.data.severity === "high") {
    const managers = await prisma.member.findMany({
      where: { organizationId: u.organizationId, role: { in: ["ADMIN", "MANAGER"] }, status: "active" },
    });
    for (const mgr of managers) {
      if (mgr.id === u.memberId) continue;
      await prisma.message.create({
        data: {
          fromId: u.memberId, toId: mgr.id,
          body: `🚨 ${parsed.data.severity.toUpperCase()} incident: ${parsed.data.title} → /incidents/${created.id}`,
        },
      });
    }
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "incident.create", entityType: "IncidentReport", entityId: created.id,
    metadata: { category: parsed.data.category, severity: parsed.data.severity },
  });

  return NextResponse.json({ ok: true, incident: created });
}
