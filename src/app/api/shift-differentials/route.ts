// Shift-differential rules CRUD. Admin defines per-org pay multipliers
// that apply by hour-of-day / day-of-week / holiday.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:         z.string().min(2).max(120),
  kind:         z.enum(["night", "weekend", "holiday", "custom"]),
  startHour:    z.number().int().min(0).max(23).nullable().optional(),
  endHour:      z.number().int().min(0).max(23).nullable().optional(),
  dayOfWeek:    z.number().int().min(0).max(6).nullable().optional(),
  holidayDates: z.array(z.string()).optional(),
  multiplier:   z.number().min(1).max(5).default(1.5),
  flatAddCents: z.number().int().min(0).max(100_00).nullable().optional(),
  active:       z.boolean().default(true),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.shiftDifferential.findMany({
    where: { organizationId: u.organizationId },
    orderBy: [{ active: "desc" }, { multiplier: "desc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const rule = await prisma.shiftDifferential.create({
    data: {
      organizationId: u.organizationId,
      name:           parsed.data.name,
      kind:           parsed.data.kind,
      startHour:      parsed.data.startHour ?? null,
      endHour:        parsed.data.endHour ?? null,
      dayOfWeek:      parsed.data.dayOfWeek ?? null,
      holidayDates:   parsed.data.holidayDates ? JSON.stringify(parsed.data.holidayDates) : null,
      multiplier:     parsed.data.multiplier,
      flatAddCents:   parsed.data.flatAddCents ?? null,
      active:         parsed.data.active,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.settings_update", entityType: "ShiftDifferential", entityId: rule.id,
    metadata: { name: rule.name, kind: rule.kind, multiplier: rule.multiplier },
  });
  return NextResponse.json({ ok: true, rule });
}
