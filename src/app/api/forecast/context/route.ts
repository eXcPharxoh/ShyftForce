import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  locationId: z.string().nullable().optional(),  // null = org-wide
  startsAt: z.string(),
  endsAt: z.string(),
  category: z.enum(["weather", "event", "holiday", "promotion", "manual"]),
  label: z.string().min(1),
  expectedImpactPct: z.number().min(-100).max(500),
  source: z.string().optional().default("manual"),
});

// GET /api/forecast/context?location=&from=&to=
export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("location");
  const from = url.searchParams.get("from");
  const to   = url.searchParams.get("to");
  const where: any = {
    organizationId: u.organizationId,
    ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}),
  };
  if (from) where.endsAt = { gt: new Date(from) };
  if (to)   where.startsAt = { ...(where.startsAt ?? {}), lt: new Date(to) };
  const items = await prisma.demandContext.findMany({ where, orderBy: { startsAt: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.locationId) {
    const loc = await prisma.location.findFirst({ where: { id: parsed.data.locationId, organizationId: u.organizationId } });
    if (!loc) return NextResponse.json({ error: "location not in org" }, { status: 404 });
  }

  const created = await prisma.demandContext.create({
    data: {
      organizationId: u.organizationId,
      locationId: parsed.data.locationId ?? null,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      category: parsed.data.category,
      label: parsed.data.label,
      expectedImpactPct: parsed.data.expectedImpactPct,
      source: parsed.data.source ?? "manual",
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "forecast.context_add", entityType: "DemandContext", entityId: created.id,
    metadata: { label: created.label, expectedImpactPct: created.expectedImpactPct },
  });
  return NextResponse.json(created);
}
