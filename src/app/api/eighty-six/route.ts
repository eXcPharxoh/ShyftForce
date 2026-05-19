// 86-list CRUD. When a manager 86's an item, every currently-on-duty member
// at the location gets a push notification + (optionally) SMS so they stop
// pitching it the moment it's marked.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { sendPush } from "@/lib/push";
import { sendSms } from "@/lib/sms";

const CreateSchema = z.object({
  locationId: z.string().min(1),
  name:       z.string().min(1).max(120),
  category:   z.enum(["food", "drink", "wine", "beer", "cocktail", "other"]).default("food"),
  notes:      z.string().max(500).optional().nullable(),
  notifyOnDutyBySms: z.boolean().default(false), // pricey; default off
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("location_id");
  const includeHistory = url.searchParams.get("history") === "1";

  // Org-scope: location must belong to user's org
  const where: any = { organizationId: u.organizationId };
  if (locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: locationId, organizationId: u.organizationId }, select: { id: true },
    });
    if (!loc) return NextResponse.json({ error: "Location not found" }, { status: 404 });
    where.locationId = locationId;
  }
  if (!includeHistory) where.active = true;

  const items = await prisma.eightySixItem.findMany({
    where, orderBy: { markedAt: "desc" }, take: 200,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const loc = await prisma.location.findFirst({
    where: { id: parsed.data.locationId, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });

  const item = await prisma.eightySixItem.create({
    data: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId,
      name:           parsed.data.name,
      category:       parsed.data.category,
      notes:          parsed.data.notes ?? null,
      markedById:     u.memberId,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "incident.create", entityType: "EightySixItem", entityId: item.id,
    metadata: { name: item.name, locationId: loc.id },
  });

  // Find members currently on duty at this location and ping them
  // (last attendance log is clock_in / break_end without a clock_out after it)
  const onDutyMembers = await prisma.member.findMany({
    where: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId,
      status:         "active",
    },
    include: {
      user: { select: { id: true, name: true } },
      attendanceLogs: { orderBy: { at: "desc" }, take: 1, select: { type: true, at: true } },
    },
  });
  const onDuty = onDutyMembers.filter(m => {
    const last = m.attendanceLogs[0];
    return last && (last.type === "clock_in" || last.type === "break_end");
  });

  const body = `🚫 86'd at ${loc.name}: ${parsed.data.name}${parsed.data.notes ? ` — ${parsed.data.notes}` : ""}`;
  await Promise.all(onDuty.map(async m => {
    sendPush(m.user.id, {
      title: `86'd: ${parsed.data.name}`,
      body:  `Stop pitching it. ${parsed.data.notes ?? ""}`,
      url:   `/eighty-six?location=${parsed.data.locationId}`,
      tag:   `86-${item.id}`,
    }).catch(() => {});
    if (parsed.data.notifyOnDutyBySms && m.phone) {
      sendSms({
        organizationId: u.organizationId, memberId: m.id,
        toNumber: m.phone, body, category: "alert", bypassOptIn: false,
      }).catch(() => {});
    }
  }));

  return NextResponse.json({ ok: true, item, notifiedOnDuty: onDuty.length });
}
