// End-of-job artifact: customer signature (base64 PNG), tech photo,
// completion notes, optional rating, parts cost for profitability math.
// Submitted by the tech at the end of a field-service shift.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { emitWebhook } from "@/lib/webhooks/emit";

const CreateSchema = z.object({
  shiftId:        z.string().min(1),
  customerName:   z.string().max(120).optional().nullable(),
  customerEmail:  z.string().email().optional().nullable(),
  signatureData:  z.string().max(200_000).optional().nullable(), // ~200KB base64 PNG
  rating:         z.number().int().min(1).max(5).optional().nullable(),
  notes:          z.string().max(4000).optional().nullable(),
  photoData:      z.string().max(500_000).optional().nullable(),
  partsCostCents: z.number().int().min(0).max(10_000_00).optional().nullable(),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Tech must own this shift (employees can only close their own jobs).
  // Managers can close anyone's.
  const shift = await prisma.shift.findFirst({
    where: { id: parsed.data.shiftId, location: { organizationId: u.organizationId } },
    select: { id: true, memberId: true, startsAt: true },
  });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  if (u.role === "EMPLOYEE" && shift.memberId !== u.memberId) {
    return NextResponse.json({ error: "You can only close your own jobs" }, { status: 403 });
  }
  if (!shift.memberId) return NextResponse.json({ error: "Shift has no assigned tech yet" }, { status: 400 });

  const closeout = await prisma.jobCloseout.upsert({
    where:  { shiftId: parsed.data.shiftId },
    create: {
      organizationId: u.organizationId,
      shiftId:        parsed.data.shiftId,
      memberId:       shift.memberId,
      customerName:   parsed.data.customerName ?? null,
      customerEmail:  parsed.data.customerEmail ?? null,
      signatureData:  parsed.data.signatureData ?? null,
      rating:         parsed.data.rating ?? null,
      notes:          parsed.data.notes ?? null,
      photoData:      parsed.data.photoData ?? null,
      partsCostCents: parsed.data.partsCostCents ?? null,
    },
    update: {
      customerName:   parsed.data.customerName ?? undefined,
      customerEmail:  parsed.data.customerEmail ?? undefined,
      signatureData:  parsed.data.signatureData ?? undefined,
      rating:         parsed.data.rating ?? undefined,
      notes:          parsed.data.notes ?? undefined,
      photoData:      parsed.data.photoData ?? undefined,
      partsCostCents: parsed.data.partsCostCents ?? undefined,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "JobCloseout", entityId: closeout.id,
    metadata: { shiftId: parsed.data.shiftId, hasSignature: !!parsed.data.signatureData, hasPhoto: !!parsed.data.photoData, rating: parsed.data.rating ?? null },
  });

  // Webhook so customer integrations (CRM, invoicing) can react
  emitWebhook({
    organizationId: u.organizationId,
    event: "shift.updated",
    data: { kind: "job_closeout", shiftId: closeout.shiftId, rating: closeout.rating, closedAt: closeout.closedAt },
  }).catch(() => {});

  return NextResponse.json({ ok: true, closeout: { id: closeout.id, closedAt: closeout.closedAt } });
}
