// Construction crews. Foreman + members.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:       z.string().min(2).max(80),
  color:      z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  foremanId:  z.string().nullable().optional(),
  notes:      z.string().max(500).nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.crew.findMany({
    where: { organizationId: u.organizationId },
    include: {
      foreman: { include: { user: { select: { name: true } } } },
      memberships: { include: { member: { include: { user: { select: { name: true } } } } } },
      _count: { select: { shifts: { where: { startsAt: { gte: new Date() } } } } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({
    items: items.map(c => ({
      id: c.id, name: c.name, color: c.color, notes: c.notes, active: c.active,
      foremanId: c.foremanId, foremanName: c.foreman?.user.name ?? null,
      members: c.memberships.map(m => ({
        memberId: m.memberId, name: m.member.user.name, role: m.role,
      })),
      upcomingShifts: c._count.shifts,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.foremanId) {
    const f = await prisma.member.findFirst({
      where: { id: parsed.data.foremanId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!f) return NextResponse.json({ error: "Foreman not in org" }, { status: 404 });
  }

  const c = await prisma.crew.create({
    data: {
      organizationId: u.organizationId,
      name: parsed.data.name,
      color: parsed.data.color ?? "#f59e0b",
      foremanId: parsed.data.foremanId ?? null,
      notes: parsed.data.notes ?? null,
    },
  });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "Crew", entityId: c.id, metadata: { name: c.name } });
  return NextResponse.json({ ok: true, crew: c });
}
