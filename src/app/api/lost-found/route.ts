// Lost & found log.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/utils";

const CreateSchema = z.object({
  description:   z.string().min(2).max(500),
  foundLocation: z.string().max(120).nullable().optional(),
  notes:         z.string().max(500).nullable().optional(),
}).strict();

const ClaimSchema = z.object({
  id:        z.string().min(1),
  claimedBy: z.string().min(1).max(120),
  status:    z.enum(["claimed", "discarded"]).default("claimed"),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") ?? "30");
  const status = url.searchParams.get("status"); // unclaimed | claimed | discarded | all

  const where: any = { organizationId: u.organizationId, foundAt: { gte: addDays(new Date(), -days) } };
  if (status && status !== "all") where.status = status;

  const items = await prisma.lostFoundItem.findMany({
    where,
    include: { loggedBy: { include: { user: { select: { name: true } } } } },
    orderBy: { foundAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    items: items.map(i => ({
      id: i.id, description: i.description, foundLocation: i.foundLocation,
      foundAt: i.foundAt, status: i.status,
      claimedBy: i.claimedBy, claimedAt: i.claimedAt, notes: i.notes,
      loggedByName: i.loggedBy?.user.name ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const i = await prisma.lostFoundItem.create({
    data: {
      organizationId: u.organizationId,
      description: parsed.data.description,
      foundLocation: parsed.data.foundLocation ?? null,
      notes: parsed.data.notes ?? null,
      loggedById: u.memberId ?? null,
    },
  });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.create", entityType: "LostFoundItem", entityId: i.id, metadata: { description: i.description } });
  return NextResponse.json({ ok: true, item: i });
}

export async function PATCH(req: Request) {
  const u = await requireUser();
  const parsed = ClaimSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.lostFoundItem.findFirst({ where: { id: parsed.data.id, organizationId: u.organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lostFoundItem.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status, claimedBy: parsed.data.claimedBy, claimedAt: new Date() },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "LostFoundItem", entityId: parsed.data.id,
    metadata: { status: parsed.data.status, claimedBy: parsed.data.claimedBy },
  });
  return NextResponse.json({ ok: true });
}
