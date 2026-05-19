// Hot-desk inventory (office/hybrid). Members book a desk for the day.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:         z.string().min(1).max(80),
  zone:         z.string().max(80).nullable().optional(),
  hasMonitor:   z.boolean().default(false),
  hasStanding:  z.boolean().default(false),
  locationId:   z.string().nullable().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const date = url.searchParams.get("date"); // YYYY-MM-DD

  const items = await prisma.hotDesk.findMany({
    where: { organizationId: u.organizationId, active: true },
    include: date ? {
      bookings: {
        where: { date: new Date(date + "T00:00:00Z") },
        include: { member: { include: { user: { select: { name: true } } } } },
      },
    } : undefined,
    orderBy: [{ zone: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    items: items.map(d => ({
      id: d.id, name: d.name, zone: d.zone,
      hasMonitor: d.hasMonitor, hasStanding: d.hasStanding,
      active: d.active,
      bookings: date ? (d as any).bookings?.map((b: any) => ({
        id: b.id, halfDay: b.halfDay, memberName: b.member.user.name, memberId: b.memberId,
      })) ?? [] : undefined,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const d = await prisma.hotDesk.create({
    data: {
      organizationId: u.organizationId,
      name: parsed.data.name,
      zone: parsed.data.zone ?? null,
      hasMonitor: parsed.data.hasMonitor,
      hasStanding: parsed.data.hasStanding,
      locationId: parsed.data.locationId ?? null,
    },
  });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "HotDesk", entityId: d.id, metadata: { name: d.name } });
  return NextResponse.json({ ok: true, hotDesk: d });
}
