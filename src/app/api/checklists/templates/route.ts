// Checklist template CRUD. Templates are reusable definitions ("Opening
// side work", "Closing kitchen") that get instantiated per-shift.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { randomBytes } from "node:crypto";

const ItemSchema = z.object({
  text:         z.string().min(2).max(280),
  requiresPhoto:z.boolean().default(false),
  requiresNote: z.boolean().default(false),
}).strict();

const CreateSchema = z.object({
  name:              z.string().min(2).max(120),
  locationId:        z.string().nullable().optional(),
  trigger:           z.enum(["pre_shift", "post_shift", "manual"]).default("post_shift"),
  requireCompletion: z.boolean().default(true),
  positions:         z.array(z.string()).optional(),
  items:             z.array(ItemSchema).min(1).max(50),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.checklistTemplate.findMany({
    where: { organizationId: u.organizationId, active: true },
    include: { location: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    items: items.map(t => ({
      id: t.id, name: t.name, trigger: t.trigger,
      requireCompletion: t.requireCompletion,
      locationId: t.locationId, locationName: t.location?.name ?? null,
      positions: t.positions ? safeParse(t.positions) : null,
      items: safeParseItems(t.items),
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Cross-tenant: location must be in org (if specified)
  if (parsed.data.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: parsed.data.locationId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });
  }

  // Tag each item with a stable id so responses can reference them
  const items = parsed.data.items.map(i => ({
    id: randomBytes(6).toString("hex"),
    text: i.text,
    requiresPhoto: i.requiresPhoto,
    requiresNote: i.requiresNote,
  }));

  const created = await prisma.checklistTemplate.create({
    data: {
      organizationId:    u.organizationId,
      locationId:        parsed.data.locationId ?? null,
      name:              parsed.data.name,
      trigger:           parsed.data.trigger,
      requireCompletion: parsed.data.requireCompletion,
      positions:         parsed.data.positions ? JSON.stringify(parsed.data.positions) : null,
      items:             JSON.stringify(items),
      createdById:       u.id,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "ChecklistTemplate", entityId: created.id,
    metadata: { name: parsed.data.name, itemCount: items.length },
  });

  return NextResponse.json({ ok: true, template: { id: created.id, name: created.name } });
}

function safeParse(s: string | null): any { try { return s ? JSON.parse(s) : null; } catch { return null; } }
function safeParseItems(s: string): any[] { try { return JSON.parse(s); } catch { return []; } }
