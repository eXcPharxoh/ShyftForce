// Per-location labor% target + breach threshold. The cron checks every
// 15-minute snapshot during open hours and texts the manager when actuals
// breach target.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const UpsertSchema = z.object({
  locationId:      z.string().min(1),
  targetPercent:   z.number().min(0).max(100),
  breachThreshold: z.number().min(0).max(20).default(3),
  alertManagerId:  z.string().nullable().optional(),
  cooldownMinutes: z.number().int().min(15).max(240).default(60),
  active:          z.boolean().default(true),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.laborTarget.findMany({
    where: { organizationId: u.organizationId },
    include: { location: { select: { name: true } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = UpsertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const loc = await prisma.location.findFirst({
    where: { id: parsed.data.locationId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });

  const target = await prisma.laborTarget.upsert({
    where: { locationId: parsed.data.locationId },
    create: {
      organizationId:  u.organizationId,
      locationId:      parsed.data.locationId,
      targetPercent:   parsed.data.targetPercent,
      breachThreshold: parsed.data.breachThreshold,
      alertManagerId:  parsed.data.alertManagerId ?? null,
      cooldownMinutes: parsed.data.cooldownMinutes,
      active:          parsed.data.active,
    },
    update: {
      targetPercent:   parsed.data.targetPercent,
      breachThreshold: parsed.data.breachThreshold,
      alertManagerId:  parsed.data.alertManagerId ?? null,
      cooldownMinutes: parsed.data.cooldownMinutes,
      active:          parsed.data.active,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.settings_update", entityType: "LaborTarget", entityId: target.id,
    metadata: parsed.data,
  });
  return NextResponse.json({ ok: true, target });
}
