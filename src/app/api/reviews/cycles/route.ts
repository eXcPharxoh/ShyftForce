// Review cycles. Admin creates a cycle with a rubric → reviews get filed
// against it → cycle closes and ratings lock.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const RubricItem = z.object({
  key:    z.string().min(1).max(40),
  label:  z.string().min(1).max(120),
  weight: z.number().min(0).max(1),
});

const CreateSchema = z.object({
  name:     z.string().min(2).max(120),
  rubric:   z.array(RubricItem).max(20).optional(),
  opensAt:  z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
}).strict();

const DEFAULT_RUBRIC = [
  { key: "quality",        label: "Quality of work",            weight: 0.25 },
  { key: "reliability",    label: "Reliability & punctuality",  weight: 0.25 },
  { key: "teamwork",       label: "Teamwork + communication",   weight: 0.20 },
  { key: "initiative",     label: "Initiative + ownership",     weight: 0.15 },
  { key: "growth",         label: "Growth + learning",          weight: 0.15 },
];

export async function GET() {
  const u = await requireUser();
  const items = await prisma.reviewCycle.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { reviews: true } } },
  });
  return NextResponse.json({
    items: items.map(c => ({
      id: c.id, name: c.name, status: c.status,
      opensAt: c.opensAt, closesAt: c.closesAt, createdAt: c.createdAt,
      rubric: c.rubric ? safeParse(c.rubric) : DEFAULT_RUBRIC,
      reviewCount: c._count.reviews,
    })),
    defaultRubric: DEFAULT_RUBRIC,
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const rubric = parsed.data.rubric ?? DEFAULT_RUBRIC;
  const created = await prisma.reviewCycle.create({
    data: {
      organizationId: u.organizationId,
      name: parsed.data.name,
      rubric: JSON.stringify(rubric),
      status: "active",
      opensAt:  parsed.data.opensAt  ? new Date(parsed.data.opensAt)  : new Date(),
      closesAt: parsed.data.closesAt ? new Date(parsed.data.closesAt) : null,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "ReviewCycle", entityId: created.id,
    metadata: { name: parsed.data.name },
  });
  return NextResponse.json({ ok: true, cycle: created });
}

function safeParse(s: string): any { try { return JSON.parse(s); } catch { return null; } }
