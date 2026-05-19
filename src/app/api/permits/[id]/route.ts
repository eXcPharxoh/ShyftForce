import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  regulator:        z.string().max(200).nullable().optional(),
  permitNumber:     z.string().max(120).nullable().optional(),
  issuedOn:         z.string().datetime().nullable().optional(),
  expiresOn:        z.string().datetime().optional(),
  feeAmountCents:   z.number().int().min(0).max(1_000_000_00).nullable().optional(),
  renewalUrl:       z.string().url().max(500).nullable().optional(),
  blocksScheduling: z.boolean().optional(),
  fileUrl:          z.string().url().max(500).nullable().optional(),
  notes:            z.string().max(2000).nullable().optional(),
  // Renewal flow: setting a new expiresOn ALSO clears the reminder bookkeeping
  // so the cadence fires fresh for the new period.
  resetReminders:   z.boolean().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.permit.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, expiresOn: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  for (const k of ["regulator", "permitNumber", "feeAmountCents", "renewalUrl", "blocksScheduling", "fileUrl", "notes"] as const) {
    if ((parsed.data as any)[k] !== undefined) data[k] = (parsed.data as any)[k];
  }
  if (parsed.data.issuedOn !== undefined)  data.issuedOn  = parsed.data.issuedOn  ? new Date(parsed.data.issuedOn)  : null;
  if (parsed.data.expiresOn !== undefined) data.expiresOn = new Date(parsed.data.expiresOn);

  // If expiresOn moved forward (renewal), clear reminder bookkeeping so cadence fires fresh.
  const renewed = parsed.data.expiresOn && new Date(parsed.data.expiresOn) > existing.expiresOn;
  if (renewed || parsed.data.resetReminders) {
    data.reminder60dSentAt = null;
    data.reminder30dSentAt = null;
    data.reminder14dSentAt = null;
    data.reminder7dSentAt  = null;
    data.reminderDaySentAt = null;
    data.reminderExpiredSentAt = null;
  }

  const updated = await prisma.permit.update({ where: { id }, data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Permit", entityId: id,
    metadata: { changes: parsed.data, renewed },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.permit.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, category: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.permit.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Permit", entityId: id,
    metadata: { deleted: existing.category },
  });
  return NextResponse.json({ ok: true });
}
