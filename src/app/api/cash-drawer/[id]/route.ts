// Close an open cash drawer session. Computes expected via POS revenue
// during the session window if a POS connection exists; otherwise expected
// is left null and variance is just close - open.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const CloseSchema = z.object({
  closeCountCents: z.number().int().min(0).max(100_000_00),
  varianceReason:  z.string().max(500).nullable().optional(),
  notes:           z.string().max(2000).nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const parsed = CloseSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const session = await prisma.cashDrawerSession.findFirst({
    where: { id, organizationId: u.organizationId },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Manager can close anyone's drawer; employee can only close their own
  if (session.memberId !== u.memberId && u.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Not your drawer" }, { status: 403 });
  }
  if (session.closedAt) return NextResponse.json({ error: "Already closed" }, { status: 400 });

  // Compute expected: openCount + cash sales during window (from POS snapshots)
  // POS snapshots come from PosRevenueSnapshot. We don't currently track
  // payment method per snapshot, so we estimate cash sales as 25% of gross
  // (industry average) until POS providers send us a breakdown.
  const closedAt = new Date();
  const posRevenue = await prisma.posRevenueSnapshot.findMany({
    where: {
      locationId: session.locationId,
      intervalStart: { gte: session.openedAt },
      intervalEnd:   { lte: closedAt },
    },
    select: { grossSalesCents: true },
  });
  const grossCents = posRevenue.reduce((a, r) => a + r.grossSalesCents, 0);
  const estCashSalesCents = grossCents > 0 ? Math.round(grossCents * 0.25) : null;
  const expectedCents = estCashSalesCents != null ? session.openCountCents + estCashSalesCents : null;
  const varianceCents = expectedCents != null ? parsed.data.closeCountCents - expectedCents : null;

  const updated = await prisma.cashDrawerSession.update({
    where: { id },
    data: {
      closedAt,
      closeCountCents: parsed.data.closeCountCents,
      expectedCents,
      varianceCents,
      varianceReason: parsed.data.varianceReason ?? null,
      notes:          parsed.data.notes ?? null,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "incident.update", entityType: "CashDrawerSession", entityId: id,
    metadata: { kind: "close", closeCountCents: parsed.data.closeCountCents, expectedCents, varianceCents },
  });

  return NextResponse.json({ ok: true, session: updated });
}
