// Employee starts a checklist (creates an instance) + fills in responses
// + completes. Used by both the pre-shift and post-shift flows.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const StartSchema = z.object({
  templateId: z.string().min(1),
  shiftId:    z.string().optional().nullable(),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const shiftId = url.searchParams.get("shift_id");

  const where: any = { memberId: u.memberId };
  if (shiftId) where.shiftId = shiftId;

  const items = await prisma.checklistInstance.findMany({
    where,
    include: { template: { select: { name: true, items: true, requireCompletion: true } } },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    items: items.map(i => ({
      id: i.id, templateId: i.templateId, templateName: i.template.name,
      requireCompletion: i.template.requireCompletion,
      items: safe(i.template.items),
      responses: safe(i.responses),
      startedAt: i.startedAt, completedAt: i.completedAt,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = StartSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Cross-tenant: template must belong to user's org
  const tpl = await prisma.checklistTemplate.findFirst({
    where: { id: parsed.data.templateId, organizationId: u.organizationId, active: true },
    select: { id: true, locationId: true },
  });
  if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  // Pick a location: template's location > member's location > shift's location
  let locationId = tpl.locationId;
  if (!locationId && parsed.data.shiftId) {
    const s = await prisma.shift.findFirst({
      where: { id: parsed.data.shiftId, location: { organizationId: u.organizationId } },
      select: { locationId: true },
    });
    locationId = s?.locationId ?? null;
  }
  if (!locationId) {
    const m = await prisma.member.findUnique({ where: { id: u.memberId }, select: { locationId: true } });
    locationId = m?.locationId ?? null;
  }
  if (!locationId) return NextResponse.json({ error: "No location to attach this checklist to" }, { status: 400 });

  const instance = await prisma.checklistInstance.create({
    data: {
      templateId: parsed.data.templateId,
      shiftId:    parsed.data.shiftId ?? null,
      memberId:   u.memberId,
      locationId,
    },
  });
  return NextResponse.json({ ok: true, instance });
}

function safe(s: string): any { try { return JSON.parse(s); } catch { return []; } }
