import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { JURISDICTIONS, applyJurisdiction } from "@/lib/compliance/jurisdictions";
import { audit } from "@/lib/audit";

// GET /api/compliance/jurisdiction → list of available jurisdictions
export async function GET() {
  return NextResponse.json({
    jurisdictions: Object.values(JURISDICTIONS).map((j) => ({
      id: j.id,
      label: j.label,
      region: j.region,
      predictiveSchedulingDays: j.predictiveSchedulingDays,
      hasPredictabilityPay: !!j.predictabilityPay,
      mealBreakAfterHours: j.mealBreakAfterHours,
      restBreakAfterHours: j.restBreakAfterHours,
      minRestGapHours: j.minRestGapHours,
      notes: j.notes,
    })),
  });
}

// POST /api/compliance/jurisdiction body { jurisdictionId }
// Applies the named jurisdiction's rule pack as the org's defaults.
export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const { jurisdictionId } = await req.json();
  if (!jurisdictionId || !JURISDICTIONS[jurisdictionId]) {
    return NextResponse.json({ error: "Unknown jurisdiction" }, { status: 400 });
  }
  const current = await prisma.complianceSettings.findUnique({ where: { organizationId: u.organizationId } });
  if (!current) return NextResponse.json({ error: "compliance settings not initialized" }, { status: 500 });
  const merged = applyJurisdiction(current, jurisdictionId);
  const updated = await prisma.complianceSettings.update({
    where: { organizationId: u.organizationId },
    data: merged,
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.update", entityType: "ComplianceSettings", entityId: updated.id,
    metadata: { jurisdictionId },
  });
  return NextResponse.json({ ok: true, settings: updated });
}
