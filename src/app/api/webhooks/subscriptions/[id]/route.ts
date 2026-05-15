import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  url:         z.string().url().max(2048).optional(),
  description: z.string().max(200).nullable().optional(),
  events:      z.array(z.string()).min(1).optional(),
  active:      z.boolean().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.webhookSubscription.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  if (parsed.data.url         !== undefined) data.url = parsed.data.url;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.events      !== undefined) data.events = JSON.stringify(parsed.data.events);
  if (parsed.data.active      !== undefined) {
    data.active = parsed.data.active;
    if (parsed.data.active) { data.consecutiveFailures = 0; data.disabledAt = null; }
  }
  const updated = await prisma.webhookSubscription.update({ where: { id }, data });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "WebhookSubscription", entityId: id, metadata: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.webhookSubscription.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, url: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.webhookSubscription.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "WebhookSubscription", entityId: id, metadata: { deleted: existing.url } });
  return NextResponse.json({ ok: true });
}
