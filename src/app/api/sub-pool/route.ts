// Substitute teacher pool. First-respond-wins callouts.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  memberId:             z.string().min(1),
  subjects:             z.array(z.string()).max(50).optional(),
  grades:               z.array(z.string()).max(20).optional(),
  hourlyRateCents:      z.number().int().min(0).max(100000).default(0),
  preferredContactHour: z.number().int().min(0).max(23).nullable().optional(),
  latestContactHour:    z.number().int().min(0).max(23).nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.subPoolMember.findMany({
    where: { organizationId: u.organizationId },
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    items: items.map(s => ({
      id: s.id, memberId: s.memberId, name: s.member.user.name, email: s.member.user.email,
      subjects: s.subjects ? JSON.parse(s.subjects) : [],
      grades: s.grades ? JSON.parse(s.grades) : [],
      hourlyRateCents: s.hourlyRateCents,
      isActive: s.isActive,
      preferredContactHour: s.preferredContactHour,
      latestContactHour: s.latestContactHour,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const m = await prisma.member.findFirst({
    where: { id: parsed.data.memberId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!m) return NextResponse.json({ error: "Member not in org" }, { status: 404 });

  try {
    const s = await prisma.subPoolMember.create({
      data: {
        organizationId: u.organizationId,
        memberId: parsed.data.memberId,
        subjects: parsed.data.subjects ? JSON.stringify(parsed.data.subjects) : null,
        grades:   parsed.data.grades   ? JSON.stringify(parsed.data.grades)   : null,
        hourlyRateCents: parsed.data.hourlyRateCents,
        preferredContactHour: parsed.data.preferredContactHour ?? null,
        latestContactHour: parsed.data.latestContactHour ?? null,
      },
    });
    await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "SubPoolMember", entityId: s.id, metadata: { memberId: parsed.data.memberId } });
    return NextResponse.json({ ok: true, subPoolMember: s });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Member already in sub pool" }, { status: 409 });
    throw e;
  }
}
