// Personal-training sessions. Booking-driven, paid per session.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/utils";

const CreateSchema = z.object({
  trainerMemberId: z.string().min(1),
  clientName:      z.string().min(1).max(120),
  clientPhone:     z.string().max(20).nullable().optional(),
  startsAt:        z.string().datetime(),
  endsAt:          z.string().datetime(),
  rateCents:       z.number().int().min(0).max(100_000_00).default(0),
  trainerSplitPct: z.number().int().min(0).max(100).default(70),
  notes:           z.string().max(500).nullable().optional(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") ?? "30");
  const mine = url.searchParams.get("mine") === "1";

  const where: any = {
    organizationId: u.organizationId,
    startsAt: { gte: addDays(new Date(), -1), lt: addDays(new Date(), days) },
  };
  if (mine && u.memberId) where.trainerMemberId = u.memberId;
  if (u.role === "EMPLOYEE" && !mine) where.trainerMemberId = u.memberId ?? "";

  const items = await prisma.ptSession.findMany({
    where,
    include: { trainer: { include: { user: { select: { name: true } } } } },
    orderBy: { startsAt: "asc" },
    take: 200,
  });
  return NextResponse.json({
    items: items.map(s => ({
      id: s.id,
      trainerId: s.trainerMemberId, trainerName: s.trainer.user.name,
      clientName: s.clientName, clientPhone: s.clientPhone,
      startsAt: s.startsAt, endsAt: s.endsAt,
      rateCents: s.rateCents, trainerSplitPct: s.trainerSplitPct,
      trainerPayCents: Math.round(s.rateCents * s.trainerSplitPct / 100),
      status: s.status, notes: s.notes,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Employees can only create sessions where they are the trainer
  if (u.role === "EMPLOYEE" && parsed.data.trainerMemberId !== u.memberId) {
    return NextResponse.json({ error: "Employees can only book sessions for themselves" }, { status: 403 });
  }

  const trainer = await prisma.member.findFirst({
    where: { id: parsed.data.trainerMemberId, organizationId: u.organizationId, status: "active" },
    select: { id: true },
  });
  if (!trainer) return NextResponse.json({ error: "Trainer not in org" }, { status: 404 });

  const s = await prisma.ptSession.create({
    data: {
      organizationId:  u.organizationId,
      trainerMemberId: parsed.data.trainerMemberId,
      clientName:      parsed.data.clientName,
      clientPhone:     parsed.data.clientPhone ?? null,
      startsAt:        new Date(parsed.data.startsAt),
      endsAt:          new Date(parsed.data.endsAt),
      rateCents:       parsed.data.rateCents,
      trainerSplitPct: parsed.data.trainerSplitPct,
      notes:           parsed.data.notes ?? null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "PtSession", entityId: s.id,
    metadata: { client: s.clientName, rateCents: s.rateCents },
  });
  return NextResponse.json({ ok: true, session: s });
}
