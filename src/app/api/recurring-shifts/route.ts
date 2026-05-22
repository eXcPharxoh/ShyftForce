import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin, requireUser } from "@/lib/session";
import { z } from "zod";
import { audit } from "@/lib/audit";

const Schema = z.object({
  memberId:   z.string().min(1),
  locationId: z.string().min(1),
  dayOfWeek:  z.number().int().min(0).max(6),
  startTime:  z.string().regex(/^\d{2}:\d{2}$/),
  endTime:    z.string().regex(/^\d{2}:\d{2}$/),
  position:   z.string().optional().nullable(),
  effectiveFrom:  z.string().optional(),
  effectiveUntil: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId");
  const where: any = { member: { organizationId: u.organizationId } };
  if (memberId) where.memberId = memberId;
  const items = await prisma.recurringShift.findMany({
    where,
    include: { member: { include: { user: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: parsed.data.memberId } });
  if (!member || member.organizationId !== u.organizationId) return NextResponse.json({ error: "member not in org" }, { status: 404 });

  // Location must also belong to the caller's org (don't trust the body id).
  const loc = await prisma.location.findFirst({
    where: { id: parsed.data.locationId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!loc) return NextResponse.json({ error: "location not in org" }, { status: 404 });

  const r = await prisma.recurringShift.create({
    data: {
      memberId: parsed.data.memberId,
      locationId: parsed.data.locationId,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime:   parsed.data.endTime,
      position:  parsed.data.position ?? null,
      effectiveFrom:  parsed.data.effectiveFrom  ? new Date(parsed.data.effectiveFrom)  : new Date(),
      effectiveUntil: parsed.data.effectiveUntil ? new Date(parsed.data.effectiveUntil) : null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "RecurringShift", entityId: r.id, metadata: parsed.data,
  });
  return NextResponse.json(r);
}
