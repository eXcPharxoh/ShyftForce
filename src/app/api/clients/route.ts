import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(120).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  billRateCents: z.number().int().nonnegative(),
  overtimeMultiplier: z.number().min(1).max(3).optional().default(1.5),
  invoiceTerms: z.enum(["net_15", "net_30", "net_60", "due_on_receipt"]).optional().default("net_30"),
  locationIds: z.array(z.string()).optional().default([]),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.clientAccount.findMany({
    where: { organizationId: u.organizationId },
    include: { locations: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Verify all locations belong to org
  if (parsed.data.locationIds.length > 0) {
    const found = await prisma.location.findMany({
      where: { id: { in: parsed.data.locationIds }, organizationId: u.organizationId },
      select: { id: true },
    });
    if (found.length !== parsed.data.locationIds.length) {
      return NextResponse.json({ error: "one or more locations not in org" }, { status: 400 });
    }
  }

  const created = await prisma.clientAccount.create({
    data: {
      organizationId: u.organizationId,
      name: parsed.data.name,
      contactName: parsed.data.contactName ?? null,
      contactEmail: parsed.data.contactEmail ?? null,
      contactPhone: parsed.data.contactPhone ?? null,
      billRateCents: parsed.data.billRateCents,
      overtimeMultiplier: parsed.data.overtimeMultiplier ?? 1.5,
      invoiceTerms: parsed.data.invoiceTerms ?? "net_30",
      notes: parsed.data.notes ?? null,
    },
  });
  if (parsed.data.locationIds.length > 0) {
    await prisma.location.updateMany({
      where: { id: { in: parsed.data.locationIds } },
      data: { clientId: created.id },
    });
  }
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "client.create", entityType: "ClientAccount", entityId: created.id,
  });
  return NextResponse.json({ ok: true, client: created });
}
