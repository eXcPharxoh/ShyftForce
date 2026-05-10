import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { getOrCreateEwaSettings } from "@/lib/ewa/settings";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  enabled: z.boolean().optional(),
  earnedRatePercent: z.number().int().min(0).max(100).optional(),
  feeCentsPerWithdrawal: z.number().int().min(0).max(2000).optional(),
  minWithdrawalCents: z.number().int().min(0).max(50_000).optional(),
  maxPerPayPeriodCents: z.number().int().min(0).max(500_000).optional(),
  providerName: z.enum(["internal_ledger", "branch", "tapcheck", "dailypay", "stripe_treasury"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  const u = await requireManagerOrAdmin();
  const s = await getOrCreateEwaSettings(u.organizationId);
  return NextResponse.json(s);
}

export async function PATCH(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  await getOrCreateEwaSettings(u.organizationId);
  const updated = await prisma.ewaSettings.update({
    where: { organizationId: u.organizationId },
    data: parsed.data,
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "ewa.settings_update", entityType: "EwaSettings", entityId: updated.id,
    metadata: parsed.data,
  });
  return NextResponse.json(updated);
}
