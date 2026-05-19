// Shrink (lost merchandise) tracking. Damage, spoilage, theft, expired.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/utils";

const CreateSchema = z.object({
  locationId:     z.string().nullable().optional(),
  departmentId:   z.string().nullable().optional(),
  reason:         z.enum(["damage", "spoilage", "theft", "expired", "return", "other"]),
  productName:    z.string().min(1).max(120),
  sku:            z.string().max(40).nullable().optional(),
  quantity:       z.number().min(0).max(10_000).default(1),
  unitValueCents: z.number().int().min(0).max(100_000_00).default(0),
  notes:          z.string().max(500).nullable().optional(),
  occurredAt:     z.string().datetime().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const reason = url.searchParams.get("reason");
  const where: any = { organizationId: u.organizationId };
  if (since)  where.occurredAt = { gte: new Date(since) };
  else        where.occurredAt = { gte: addDays(new Date(), -30) };
  if (reason) where.reason = reason;

  const items = await prisma.shrinkEvent.findMany({
    where,
    include: { reportedBy: { include: { user: { select: { name: true } } } } },
    orderBy: { occurredAt: "desc" },
    take: 200,
  });

  // Aggregate by reason for the summary
  const totalCents = items.reduce((a, e) => a + e.totalValueCents, 0);
  const byReason: Record<string, { count: number; valueCents: number }> = {};
  for (const e of items) {
    byReason[e.reason] = byReason[e.reason] ?? { count: 0, valueCents: 0 };
    byReason[e.reason].count++;
    byReason[e.reason].valueCents += e.totalValueCents;
  }

  return NextResponse.json({
    items: items.map(e => ({
      id: e.id, reason: e.reason, productName: e.productName, sku: e.sku,
      quantity: e.quantity, unitValueCents: e.unitValueCents, totalValueCents: e.totalValueCents,
      notes: e.notes, occurredAt: e.occurredAt,
      reportedByName: e.reportedBy?.user.name ?? null,
    })),
    summary: { totalCents, byReason },
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const totalValueCents = Math.round(parsed.data.unitValueCents * parsed.data.quantity);

  const e = await prisma.shrinkEvent.create({
    data: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId ?? null,
      departmentId:   parsed.data.departmentId ?? null,
      reportedById:   u.memberId ?? null,
      reason:         parsed.data.reason,
      productName:    parsed.data.productName,
      sku:            parsed.data.sku ?? null,
      quantity:       parsed.data.quantity,
      unitValueCents: parsed.data.unitValueCents,
      totalValueCents,
      notes:          parsed.data.notes ?? null,
      occurredAt:     parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "ShrinkEvent", entityId: e.id,
    metadata: { reason: e.reason, valueCents: e.totalValueCents },
  });
  return NextResponse.json({ ok: true, event: e });
}
