// CRUD for named schedule templates. Save current week → reuse anytime.
// Stronger than "copy from last week" because saved templates don't drift
// with whatever happened to be on the calendar in any specific week.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays, startOfWeek } from "@/lib/utils";

const CreateSchema = z.object({
  name:        z.string().min(2).max(80),
  description: z.string().max(500).optional().nullable(),
  // Source week to snapshot. If omitted, defaults to the current week.
  weekStart:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

type SavedShift = {
  dayOfWeek:  number;   // 0 = Sunday, 6 = Saturday
  startTime:  string;   // "HH:MM"
  endTime:    string;
  locationId: string;
  memberId:   string | null; // null = open shift
  position:   string | null;
};

function hhmm(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export async function GET() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.scheduleTemplate.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    items: items.map(t => ({
      id: t.id, name: t.name, description: t.description,
      shiftCount: safeCount(t.shifts), createdAt: t.createdAt, updatedAt: t.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const weekStart = parsed.data.weekStart ? new Date(parsed.data.weekStart) : startOfWeek(new Date());
  weekStart.setHours(0,0,0,0);
  const weekEnd = addDays(weekStart, 7);

  const shifts = await prisma.shift.findMany({
    where: {
      location: { organizationId: u.organizationId },
      startsAt: { gte: weekStart, lt: weekEnd },
    },
    select: { startsAt: true, endsAt: true, locationId: true, memberId: true, position: true },
  });

  const saved: SavedShift[] = shifts.map(s => ({
    dayOfWeek:  s.startsAt.getDay(),
    startTime:  hhmm(s.startsAt),
    endTime:    hhmm(s.endsAt),
    locationId: s.locationId,
    memberId:   s.memberId,
    position:   s.position,
  }));

  const tpl = await prisma.scheduleTemplate.create({
    data: {
      organizationId: u.organizationId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      shifts: JSON.stringify(saved),
      createdById: u.id,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.create", entityType: "ScheduleTemplate", entityId: tpl.id,
    metadata: { name: tpl.name, snapshotShiftCount: saved.length, weekStart: weekStart.toISOString().slice(0,10) },
  });

  return NextResponse.json({ ok: true, template: { id: tpl.id, name: tpl.name, shiftCount: saved.length } });
}

function safeCount(json: string): number {
  try { return (JSON.parse(json) as any[]).length; } catch { return 0; }
}
