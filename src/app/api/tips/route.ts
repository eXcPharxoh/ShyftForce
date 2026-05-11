import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { distributeTips, type DistributionRule } from "@/lib/tips/distribute";
import { z } from "zod";

const Schema = z.object({
  locationId: z.string(),
  date: z.string(), // YYYY-MM-DD
  totalTipsCents: z.number().int().nonnegative(),
  distributionRule: z.enum(["hours", "role_weighted", "equal", "custom"]).default("hours"),
  includePositions: z.array(z.string()).optional(),
  customWeights: z.record(z.number()).optional(),
  notes: z.string().max(500).nullable().optional(),
  finalize: z.boolean().optional().default(false),
});

export async function GET(req: Request) {
  const u = await requireManagerOrAdmin();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("location");
  const where: any = { organizationId: u.organizationId };
  if (locationId) where.locationId = locationId;
  const pools = await prisma.tipPool.findMany({
    where,
    include: {
      location: true,
      distributions: { include: { member: { include: { user: true } } } },
    },
    orderBy: { date: "desc" },
    take: 60,
  });
  return NextResponse.json({ pools });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const loc = await prisma.location.findFirst({ where: { id: parsed.data.locationId, organizationId: u.organizationId } });
  if (!loc) return NextResponse.json({ error: "location not in org" }, { status: 404 });

  const date = new Date(`${parsed.data.date}T00:00:00`);
  const { rows, totalDistributedCents, unallocatedCents } = await distributeTips({
    organizationId: u.organizationId,
    locationId: parsed.data.locationId,
    date,
    totalTipsCents: parsed.data.totalTipsCents,
    rule: parsed.data.distributionRule as DistributionRule,
    includePositions: parsed.data.includePositions,
    customWeights: parsed.data.customWeights,
  });

  // Persist the pool + distributions
  const pool = await prisma.$transaction(async (tx) => {
    const p = await tx.tipPool.create({
      data: {
        organizationId: u.organizationId,
        locationId: parsed.data.locationId,
        date,
        totalTipsCents: parsed.data.totalTipsCents,
        distributionRule: parsed.data.distributionRule,
        notes: parsed.data.notes ?? null,
        createdById: u.memberId,
        status: parsed.data.finalize ? "finalized" : "draft",
      },
    });
    if (rows.length > 0) {
      await tx.tipDistribution.createMany({
        data: rows.map((r) => ({
          tipPoolId: p.id,
          memberId: r.memberId,
          hoursWorked: r.hours,
          weight: r.weight,
          amountCents: r.amountCents,
        })),
      });
    }
    return p;
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "tips.distribute", entityType: "TipPool", entityId: pool.id,
    metadata: { totalCents: parsed.data.totalTipsCents, rule: parsed.data.distributionRule, contributors: rows.length },
  });

  return NextResponse.json({
    ok: true, pool, distributions: rows,
    totalDistributedCents, unallocatedCents,
  });
}
