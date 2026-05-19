// Class periods (1st bell, 2nd bell, ...). Shifts can be tied to a period.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const CreateSchema = z.object({
  number:     z.number().int().min(1).max(20),
  name:       z.string().max(40).nullable().optional(),
  startTime:  z.string().regex(TIME),
  endTime:    z.string().regex(TIME),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.classPeriod.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { number: "asc" },
  });
  return NextResponse.json({
    items: items.map(p => ({
      id: p.id, number: p.number, name: p.name,
      startTime: p.startTime, endTime: p.endTime,
      daysOfWeek: JSON.parse(p.daysOfWeek),
      active: p.active,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const p = await prisma.classPeriod.create({
      data: {
        organizationId: u.organizationId,
        number: parsed.data.number,
        name: parsed.data.name ?? null,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        daysOfWeek: JSON.stringify(parsed.data.daysOfWeek ?? [1,2,3,4,5]),
      },
    });
    await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "ClassPeriod", entityId: p.id, metadata: { number: p.number } });
    return NextResponse.json({ ok: true, period: p });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Period number already exists" }, { status: 409 });
    throw e;
  }
}
