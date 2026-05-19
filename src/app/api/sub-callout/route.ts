// Trigger a substitute callout for a teacher's missed shift.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { startCallout } from "@/lib/education/sub-callout";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  shiftId:  z.string().min(1),
  subjects: z.array(z.string()).max(10).optional(),
  grades:   z.array(z.string()).max(13).optional(),
  notes:    z.string().max(500).nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.subCallout.findMany({
    where: { organizationId: u.organizationId },
    include: {
      shift: { include: { location: { select: { name: true } } } },
      offers: {
        include: { sub: { include: { member: { include: { user: { select: { name: true } } } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    items: items.map(c => ({
      id: c.id, status: c.status,
      shiftId: c.shiftId,
      startsAt: c.shift.startsAt, locationName: c.shift.location.name,
      subjects: c.subjects ? JSON.parse(c.subjects) : [],
      grades:   c.grades   ? JSON.parse(c.grades)   : [],
      expiresAt: c.expiresAt,
      filledAt:  c.filledAt,
      offers: c.offers.map(o => ({
        memberName: o.sub.member.user.name,
        status:     o.status,
        sentAt:     o.sentAt,
        respondedAt: o.respondedAt,
      })),
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Determine base URL for the claim link
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const callout = await startCallout({
      organizationId: u.organizationId,
      shiftId:        parsed.data.shiftId,
      triggeredById:  u.memberId ?? null,
      subjects:       parsed.data.subjects ?? [],
      grades:         parsed.data.grades ?? [],
      notes:          parsed.data.notes ?? null,
      baseUrl:        origin,
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "shift.create", entityType: "SubCallout", entityId: callout.id,
      metadata: { shiftId: parsed.data.shiftId, offers: callout.offers.length },
    });
    return NextResponse.json({ ok: true, callout: { id: callout.id, offersSent: callout.offers.length, expiresAt: callout.expiresAt } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 400 });
  }
}
