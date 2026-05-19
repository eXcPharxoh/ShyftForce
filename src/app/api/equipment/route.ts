// Construction equipment + tool tracking.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name:         z.string().min(1).max(80),
  category:     z.enum(["tool", "machine", "scaffolding", "safety_gear", "other"]).default("tool"),
  serialNumber: z.string().max(80).nullable().optional(),
  notes:        z.string().max(500).nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.equipment.findMany({
    where: { organizationId: u.organizationId },
    include: {
      assignments: {
        where: { returnedAt: null },
        include: { member: { include: { user: { select: { name: true } } } }, shift: { select: { startsAt: true, endsAt: true } } },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    items: items.map(e => ({
      id: e.id, name: e.name, category: e.category, serialNumber: e.serialNumber,
      status: e.status, notes: e.notes,
      currentAssignment: e.assignments[0] ? {
        memberName: e.assignments[0].member.user.name,
        shiftStartsAt: e.assignments[0].shift?.startsAt ?? null,
      } : null,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const e = await prisma.equipment.create({
    data: {
      organizationId: u.organizationId,
      name: parsed.data.name,
      category: parsed.data.category,
      serialNumber: parsed.data.serialNumber ?? null,
      notes: parsed.data.notes ?? null,
    },
  });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "Equipment", entityId: e.id, metadata: { name: e.name } });
  return NextResponse.json({ ok: true, equipment: e });
}
