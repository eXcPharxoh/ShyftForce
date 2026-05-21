// Time-off blackout windows. Manager-defined date ranges that block
// (or warn on) new PTO requests. Pre-populated from stat holidays.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:       z.string().min(2).max(120),
  startsOn:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode:       z.enum(["hard", "soft", "warn"]).default("soft"),
  locationId: z.string().nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.timeOffBlackout.findMany({
    where: { organizationId: u.organizationId, endsOn: { gte: new Date() } },
    include: { location: { select: { name: true } }, createdBy: { include: { user: { select: { name: true } } } } },
    orderBy: { startsOn: "asc" },
    take: 100,
  });
  return NextResponse.json({
    items: items.map(b => ({
      id: b.id,
      name: b.name,
      startsOn: b.startsOn.toISOString().slice(0, 10),
      endsOn:   b.endsOn.toISOString().slice(0, 10),
      mode: b.mode,
      locationId: b.locationId,
      locationName: b.location?.name ?? null,
      createdByName: b.createdBy?.user.name ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const start = new Date(parsed.data.startsOn + "T00:00:00Z");
  const end   = new Date(parsed.data.endsOn + "T23:59:59Z");
  if (end < start) return NextResponse.json({ error: "End date must be on or after start" }, { status: 400 });

  if (parsed.data.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: parsed.data.locationId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });
  }

  const b = await prisma.timeOffBlackout.create({
    data: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId ?? null,
      name:           parsed.data.name,
      startsOn:       start,
      endsOn:         end,
      mode:           parsed.data.mode,
      createdById:    u.memberId ?? null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "TimeOffBlackout", entityId: b.id,
    metadata: { name: b.name, range: `${parsed.data.startsOn}…${parsed.data.endsOn}`, mode: b.mode },
  });
  return NextResponse.json({ ok: true, id: b.id });
}
