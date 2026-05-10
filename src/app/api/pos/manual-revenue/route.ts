import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  locationId: z.string(),
  intervalStart: z.string(), // ISO
  intervalEnd: z.string(),   // ISO
  grossSalesCents: z.number().int().nonnegative(),
  netSalesCents: z.number().int().nonnegative().optional().nullable(),
  transactionCount: z.number().int().nonnegative().optional().default(0),
});

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const loc = await prisma.location.findFirst({ where: { id: parsed.data.locationId, organizationId: u.organizationId } });
  if (!loc) return NextResponse.json({ error: "location not in org" }, { status: 404 });

  // Find or create a manual connection for this location
  let conn = await prisma.posConnection.findFirst({
    where: { organizationId: u.organizationId, locationId: parsed.data.locationId, provider: "manual" },
  });
  if (!conn) {
    conn = await prisma.posConnection.create({
      data: { organizationId: u.organizationId, locationId: parsed.data.locationId, provider: "manual", status: "connected" },
    });
  }

  const intervalStart = new Date(parsed.data.intervalStart);
  const intervalEnd   = new Date(parsed.data.intervalEnd);
  if (Number.isNaN(+intervalStart) || Number.isNaN(+intervalEnd) || intervalEnd <= intervalStart) {
    return NextResponse.json({ error: "invalid interval" }, { status: 400 });
  }

  const snap = await prisma.posRevenueSnapshot.upsert({
    where: { locationId_intervalStart_intervalEnd: { locationId: parsed.data.locationId, intervalStart, intervalEnd } },
    create: {
      connectionId: conn.id, locationId: parsed.data.locationId,
      intervalStart, intervalEnd,
      grossSalesCents: parsed.data.grossSalesCents,
      netSalesCents: parsed.data.netSalesCents ?? null,
      transactionCount: parsed.data.transactionCount ?? 0,
      source: "manual",
    },
    update: {
      grossSalesCents: parsed.data.grossSalesCents,
      netSalesCents: parsed.data.netSalesCents ?? null,
      transactionCount: parsed.data.transactionCount ?? 0,
      source: "manual",
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "pos.manual_revenue", entityType: "PosRevenueSnapshot", entityId: snap.id,
    metadata: { locationId: parsed.data.locationId, grossSalesCents: parsed.data.grossSalesCents },
  });

  return NextResponse.json({ ok: true, snapshot: snap });
}
