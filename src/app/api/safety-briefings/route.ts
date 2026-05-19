// Daily safety briefings. Foreman posts; crew must ack.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/utils";

const CreateSchema = z.object({
  topic:   z.string().min(2).max(120),
  details: z.string().max(2000).nullable().optional(),
  shiftId: z.string().nullable().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") ?? "7");

  const items = await prisma.safetyBriefing.findMany({
    where: { organizationId: u.organizationId, postedAt: { gte: addDays(new Date(), -days) } },
    include: {
      acks: { include: { member: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: { postedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    items: items.map(b => ({
      id: b.id, topic: b.topic, details: b.details, postedAt: b.postedAt,
      shiftId: b.shiftId,
      acks: b.acks.map(a => ({ memberId: a.memberId, name: a.member.user.name, ackedAt: a.ackedAt })),
      ackedByMe: u.memberId ? b.acks.some(a => a.memberId === u.memberId) : false,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  if (u.role === "EMPLOYEE") return NextResponse.json({ error: "Only managers/foremen can post briefings" }, { status: 403 });
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const b = await prisma.safetyBriefing.create({
    data: {
      organizationId: u.organizationId,
      topic: parsed.data.topic,
      details: parsed.data.details ?? null,
      shiftId: parsed.data.shiftId ?? null,
      postedById: u.memberId ?? null,
    },
  });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.create", entityType: "SafetyBriefing", entityId: b.id, metadata: { topic: b.topic } });
  return NextResponse.json({ ok: true, briefing: b });
}

// Acknowledge
const AckSchema = z.object({ briefingId: z.string().min(1) }).strict();
export async function PATCH(req: Request) {
  const u = await requireUser();
  if (!u.memberId) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  const parsed = AckSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const b = await prisma.safetyBriefing.findFirst({ where: { id: parsed.data.briefingId, organizationId: u.organizationId }, select: { id: true } });
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await prisma.safetyBriefingAck.create({
      data: { briefingId: parsed.data.briefingId, memberId: u.memberId },
    });
  } catch (e: any) {
    if (e.code !== "P2002") throw e;
  }
  return NextResponse.json({ ok: true });
}
