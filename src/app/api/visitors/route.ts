// Visitor sign-in log.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/utils";

const CreateSchema = z.object({
  name:         z.string().min(1).max(120),
  company:      z.string().max(120).nullable().optional(),
  hostMemberId: z.string().min(1),
  badgeNumber:  z.string().max(40).nullable().optional(),
  purpose:      z.string().max(200).nullable().optional(),
  locationId:   z.string().nullable().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const active = url.searchParams.get("active") === "1"; // only currently-on-site

  const where: any = { organizationId: u.organizationId };
  if (active) where.checkedOutAt = null;
  else where.checkedInAt = { gte: addDays(new Date(), -7) };

  const items = await prisma.visitor.findMany({
    where,
    include: { host: { include: { user: { select: { name: true } } } } },
    orderBy: { checkedInAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    items: items.map(v => ({
      id: v.id, name: v.name, company: v.company, badgeNumber: v.badgeNumber, purpose: v.purpose,
      checkedInAt: v.checkedInAt, checkedOutAt: v.checkedOutAt,
      hostName: v.host.user.name, hostMemberId: v.hostMemberId,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const host = await prisma.member.findFirst({
    where: { id: parsed.data.hostMemberId, organizationId: u.organizationId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!host) return NextResponse.json({ error: "Host not in org" }, { status: 404 });

  const v = await prisma.visitor.create({
    data: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId ?? null,
      name:           parsed.data.name,
      company:        parsed.data.company ?? null,
      hostMemberId:   parsed.data.hostMemberId,
      badgeNumber:    parsed.data.badgeNumber ?? null,
      purpose:        parsed.data.purpose ?? null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "Visitor", entityId: v.id,
    metadata: { name: v.name, host: host.user.name },
  });
  return NextResponse.json({ ok: true, visitor: v });
}

// Check out
const CheckoutSchema = z.object({ id: z.string().min(1) }).strict();
export async function PATCH(req: Request) {
  const u = await requireUser();
  const parsed = CheckoutSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const v = await prisma.visitor.findFirst({
    where: { id: parsed.data.id, organizationId: u.organizationId },
    select: { id: true, checkedOutAt: true },
  });
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (v.checkedOutAt) return NextResponse.json({ error: "Already checked out" }, { status: 400 });

  await prisma.visitor.update({ where: { id: v.id }, data: { checkedOutAt: new Date() } });
  return NextResponse.json({ ok: true });
}
