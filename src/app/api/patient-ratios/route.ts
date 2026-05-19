// Patient-to-staff ratio rules. Healthcare orgs set the floor for each
// (unit, role). The scheduler refuses to assign shifts that would breach.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const UNITS = [
  { v: "med_surg",   l: "Med-surg" },
  { v: "icu",        l: "ICU / Critical care" },
  { v: "step_down",  l: "Step-down / Telemetry" },
  { v: "ed",         l: "Emergency department" },
  { v: "psych",      l: "Psychiatric" },
  { v: "labor",      l: "Labor & delivery" },
  { v: "pacu",       l: "Post-anesthesia (PACU)" },
  { v: "lt_care",    l: "Long-term care" },
  { v: "custom",     l: "Custom unit" },
];

// CA Title 22 ratios — pre-seeded defaults the admin can override.
const CA_DEFAULTS = [
  { unit: "icu",       role: "RN", patientCount: 2, staffCount: 1 },
  { unit: "step_down", role: "RN", patientCount: 4, staffCount: 1 },
  { unit: "med_surg",  role: "RN", patientCount: 5, staffCount: 1 },
  { unit: "ed",        role: "RN", patientCount: 4, staffCount: 1 },
  { unit: "psych",     role: "RN", patientCount: 6, staffCount: 1 },
  { unit: "labor",     role: "RN", patientCount: 2, staffCount: 1 },
  { unit: "pacu",      role: "RN", patientCount: 2, staffCount: 1 },
];

const UpsertSchema = z.object({
  locationId:    z.string().nullable().optional(),
  unit:          z.string().min(1).max(40),
  customLabel:   z.string().max(80).nullable().optional(),
  role:          z.enum(["RN", "LPN", "CNA"]),
  patientCount:  z.number().int().min(1).max(100),
  staffCount:    z.number().int().min(1).max(20),
  notes:         z.string().max(500).nullable().optional(),
  active:        z.boolean().default(true),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.patientRatioRule.findMany({
    where: { organizationId: u.organizationId },
    include: { location: { select: { name: true } } },
    orderBy: [{ unit: "asc" }, { role: "asc" }],
  });
  return NextResponse.json({
    items: items.map(r => ({
      id: r.id, locationId: r.locationId, locationName: r.location?.name ?? null,
      unit: r.unit, customLabel: r.customLabel, role: r.role,
      patientCount: r.patientCount, staffCount: r.staffCount,
      notes: r.notes, active: r.active,
    })),
    catalog: { units: UNITS, caDefaults: CA_DEFAULTS },
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = UpsertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: parsed.data.locationId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!loc) return NextResponse.json({ error: "Location not in org" }, { status: 404 });
  }

  const rule = await prisma.patientRatioRule.create({
    data: {
      organizationId: u.organizationId,
      locationId:     parsed.data.locationId ?? null,
      unit:           parsed.data.unit,
      customLabel:    parsed.data.customLabel ?? null,
      role:           parsed.data.role,
      patientCount:   parsed.data.patientCount,
      staffCount:     parsed.data.staffCount,
      notes:          parsed.data.notes ?? null,
      active:         parsed.data.active,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.settings_update", entityType: "PatientRatioRule", entityId: rule.id,
    metadata: { unit: rule.unit, role: rule.role, ratio: `${rule.staffCount}:${rule.patientCount}` },
  });
  return NextResponse.json({ ok: true, rule });
}
