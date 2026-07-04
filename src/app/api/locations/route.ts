// Tenant-side location CRUD. Without this, a new org's only locations are
// whatever the seed/onboarding-template created — manager couldn't add a site.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { PLANS, effectivePlanKey } from "@/lib/stripe";
import { geocodeAddress } from "@/lib/geo/geocode";

const CreateSchema = z.object({
  name:                 z.string().min(2).max(80),
  // A free-text street address the caller can send instead of raw lat/lng
  // (the setup wizard does this). When present and lat/lng aren't given,
  // we geocode it server-side so GPS clock-in works on day one. Previously
  // the schema was .strict() with no address key, so the wizard's
  // { name, address } POST failed with "Invalid input" — a hard onboarding
  // blocker.
  address:              z.string().max(300).optional(),
  latitude:             z.number().min(-90).max(90).optional().nullable(),
  longitude:            z.number().min(-180).max(180).optional().nullable(),
  geofenceRadiusMeters: z.number().int().min(10).max(50_000).default(100),
  weeklyBudget:         z.number().min(0).max(10_000_000).optional().nullable(),
  projectedRevenue:     z.number().min(0).max(100_000_000).optional().nullable(),
  clientId:             z.string().nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.location.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Plan-level location cap (effectivePlanKey honors active trials → unlimited)
  const [org, locationCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: u.organizationId }, select: { plan: true, trialEndsAt: true } }),
    prisma.location.count({ where: { organizationId: u.organizationId } }),
  ]);
  const planKey = effectivePlanKey(org);
  const planDef = PLANS[planKey];
  if (locationCount >= planDef.maxLocations) {
    return NextResponse.json({
      error: `${planDef.label} allows ${planDef.maxLocations} location${planDef.maxLocations === 1 ? "" : "s"}. Upgrade to add more sites.`,
      planCapHit: true,
    }, { status: 402 });
  }

  // If a clientId is supplied, verify it belongs to this org
  if (parsed.data.clientId) {
    const client = await prisma.clientAccount.findFirst({
      where: { id: parsed.data.clientId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found in this org" }, { status: 404 });
  }

  // If the caller sent a free-text address and no explicit coordinates,
  // geocode it so GPS clock-in has a center point on day one. Best-effort:
  // geocodeAddress returns null on failure and we simply store without coords.
  let lat = parsed.data.latitude ?? null;
  let lng = parsed.data.longitude ?? null;
  if (lat == null && lng == null && parsed.data.address) {
    const geo = await geocodeAddress(parsed.data.address).catch(() => null);
    if (geo) { lat = geo.lat; lng = geo.lng; }
  }

  try {
    const created = await prisma.location.create({
      data: {
        organizationId: u.organizationId,
        name: parsed.data.name,
        latitude: lat,
        longitude: lng,
        geofenceRadiusMeters: parsed.data.geofenceRadiusMeters,
        // Dual-write: dollars (legacy) + cents (canonical).
        weeklyBudget:          parsed.data.weeklyBudget ?? null,
        weeklyBudgetCents:     parsed.data.weeklyBudget == null ? null : Math.round(parsed.data.weeklyBudget * 100),
        projectedRevenue:      parsed.data.projectedRevenue ?? null,
        projectedRevenueCents: parsed.data.projectedRevenue == null ? null : Math.round(parsed.data.projectedRevenue * 100),
        clientId: parsed.data.clientId ?? null,
      },
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "org.update", entityType: "Location", entityId: created.id,
      metadata: { name: created.name },
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error("[locations] create failed", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
