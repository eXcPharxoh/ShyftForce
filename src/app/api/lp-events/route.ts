// Loss prevention events (retail). Lighter than security IncidentReport.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/utils";

const CreateSchema = z.object({
  type:        z.enum(["shoplift", "register_error", "breakage", "refund_fraud", "sweethearting", "other"]),
  description: z.string().min(2).max(1000),
  valueCents:  z.number().int().min(0).max(1_000_000_00).nullable().optional(),
  locationId:  z.string().nullable().optional(),
  occurredAt:  z.string().datetime().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const where: any = { organizationId: u.organizationId };
  if (since) where.occurredAt = { gte: new Date(since) };
  else       where.occurredAt = { gte: addDays(new Date(), -30) };

  const items = await prisma.lossPreventionEvent.findMany({
    where,
    include: { reportedBy: { include: { user: { select: { name: true } } } } },
    orderBy: { occurredAt: "desc" },
    take: 200,
  });

  const totalCents = items.reduce((a, e) => a + (e.valueCents ?? 0), 0);
  const byType: Record<string, { count: number; valueCents: number }> = {};
  for (const e of items) {
    byType[e.type] = byType[e.type] ?? { count: 0, valueCents: 0 };
    byType[e.type].count++;
    byType[e.type].valueCents += (e.valueCents ?? 0);
  }

  return NextResponse.json({
    items: items.map(e => ({
      id: e.id, type: e.type, description: e.description,
      valueCents: e.valueCents, occurredAt: e.occurredAt,
      reportedByName: e.reportedBy?.user.name ?? null,
    })),
    summary: { totalCents, byType },
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const e = await prisma.lossPreventionEvent.create({
    data: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId ?? null,
      type:           parsed.data.type,
      description:    parsed.data.description,
      valueCents:     parsed.data.valueCents ?? null,
      reportedById:   u.memberId ?? null,
      occurredAt:     parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "LossPreventionEvent", entityId: e.id,
    metadata: { type: e.type, valueCents: e.valueCents ?? 0 },
  });
  return NextResponse.json({ ok: true, event: e });
}
