// Get / apply / delete a single schedule template.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays, startOfWeek } from "@/lib/utils";

type SavedShift = {
  dayOfWeek:  number;
  startTime:  string;
  endTime:    string;
  locationId: string;
  memberId:   string | null;
  position:   string | null;
};

const ApplySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  publish:   z.boolean().optional(),
  skipConflicts: z.boolean().default(true),
}).strict();

const PatchSchema = z.object({
  name:        z.string().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
}).strict();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const tpl = await prisma.scheduleTemplate.findFirst({
    where: { id, organizationId: u.organizationId },
  });
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let shifts: SavedShift[] = [];
  try { shifts = JSON.parse(tpl.shifts); } catch {}
  return NextResponse.json({
    id: tpl.id, name: tpl.name, description: tpl.description,
    createdAt: tpl.createdAt, updatedAt: tpl.updatedAt, shifts,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.scheduleTemplate.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.scheduleTemplate.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.scheduleTemplate.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.scheduleTemplate.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "shift.delete", entityType: "ScheduleTemplate", entityId: id, metadata: { deleted: existing.name } });
  return NextResponse.json({ ok: true });
}

// POST /api/schedule/templates/[id]/apply  body: { weekStart?, publish?, skipConflicts? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = ApplySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const tpl = await prisma.scheduleTemplate.findFirst({
    where: { id, organizationId: u.organizationId },
  });
  if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  let saved: SavedShift[] = [];
  try { saved = JSON.parse(tpl.shifts); } catch {
    return NextResponse.json({ error: "Template is corrupted" }, { status: 500 });
  }

  const weekStart = parsed.data.weekStart ? new Date(parsed.data.weekStart) : startOfWeek(addDays(new Date(), 7));
  weekStart.setHours(0,0,0,0);
  const weekEnd = addDays(weekStart, 7);

  // Pre-fetch existing shifts to skip conflicts
  const existing = parsed.data.skipConflicts ? await prisma.shift.findMany({
    where: { location: { organizationId: u.organizationId }, startsAt: { gte: weekStart, lt: weekEnd } },
    select: { memberId: true, startsAt: true, endsAt: true, locationId: true },
  }) : [];

  // Verify all locations + members in the template still belong to this org
  const [orgLocs, orgMems] = await Promise.all([
    prisma.location.findMany({ where: { organizationId: u.organizationId }, select: { id: true } }),
    prisma.member.findMany({ where: { organizationId: u.organizationId }, select: { id: true } }),
  ]);
  const allowedLoc = new Set(orgLocs.map(l => l.id));
  const allowedMem = new Set(orgMems.map(m => m.id));

  const rows: any[] = [];
  let skipped = 0;
  for (const s of saved) {
    if (!allowedLoc.has(s.locationId)) { skipped++; continue; }
    if (s.memberId && !allowedMem.has(s.memberId)) { skipped++; continue; }

    const day = addDays(weekStart, s.dayOfWeek);
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    const startsAt = new Date(day); startsAt.setHours(sh, sm, 0, 0);
    let endsAt    = new Date(day); endsAt.setHours(eh, em, 0, 0);
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24*3600*1000);

    if (parsed.data.skipConflicts) {
      const collides = existing.some(x =>
        x.memberId === s.memberId &&
        x.locationId === s.locationId &&
        x.startsAt < endsAt && x.endsAt > startsAt,
      );
      if (collides) { skipped++; continue; }
    }

    rows.push({
      locationId: s.locationId,
      memberId:   s.memberId,
      startsAt, endsAt,
      position:   s.position,
      isOpen:     !s.memberId,
      status:     parsed.data.publish ? "published" : "draft",
    });
  }

  const created = rows.length > 0
    ? (await prisma.shift.createMany({ data: rows })).count
    : 0;

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: parsed.data.publish ? "shift.publish" : "shift.create",
    entityType: "ScheduleTemplate", entityId: tpl.id,
    metadata: { name: tpl.name, weekStart: weekStart.toISOString().slice(0,10), created, skipped },
  });

  return NextResponse.json({ created, skipped, weekStart: weekStart.toISOString().slice(0,10) });
}
