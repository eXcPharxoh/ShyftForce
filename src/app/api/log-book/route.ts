// Manager Log Book — daily shift journal.
// Manager-only (admin or manager). Different from DayNote (staff-facing
// announcements); these are private operator recaps with categories.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/utils";

const CATEGORIES = ["recap", "incident", "vip", "maintenance", "inventory", "safety", "other"] as const;

const CreateSchema = z.object({
  occurredOn:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locationId:       z.string().nullable().optional(),
  category:         z.enum(CATEGORIES).default("recap"),
  title:            z.string().max(120).nullable().optional(),
  body:             z.string().min(1).max(8000),
  followUpRequired: z.boolean().default(false),
}).strict();

export async function GET(req: Request) {
  const u = await requireManagerOrAdmin();
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") ?? "30");
  const locationId = url.searchParams.get("locationId");
  const category   = url.searchParams.get("category");

  const where: any = {
    organizationId: u.organizationId,
    occurredOn: { gte: addDays(new Date(), -days) },
  };
  if (locationId) where.locationId = locationId;
  if (category)   where.category = category;

  const items = await prisma.shiftLogEntry.findMany({
    where,
    include: {
      author:    { include: { user: { select: { name: true } } } },
      location:  { select: { name: true } },
    },
    orderBy: { occurredOn: "desc" },
    take: 200,
  });

  return NextResponse.json({
    items: items.map(e => ({
      id: e.id,
      occurredOn: e.occurredOn.toISOString().slice(0, 10),
      category: e.category,
      title: e.title,
      body: e.body,
      authorName: e.author.user.name,
      locationName: e.location?.name ?? null,
      followUpRequired: e.followUpRequired,
      resolvedAt: e.resolvedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  if (!u.memberId) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: parsed.data.locationId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });
  }

  const entry = await prisma.shiftLogEntry.create({
    data: {
      organizationId:   u.organizationId,
      authorId:         u.memberId,
      locationId:       parsed.data.locationId ?? null,
      occurredOn:       new Date(parsed.data.occurredOn + "T12:00:00Z"),
      category:         parsed.data.category,
      title:            parsed.data.title ?? null,
      body:             parsed.data.body,
      followUpRequired: parsed.data.followUpRequired,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "ShiftLogEntry", entityId: entry.id,
    metadata: { category: entry.category, occurredOn: parsed.data.occurredOn },
  });

  return NextResponse.json({ ok: true, id: entry.id });
}
