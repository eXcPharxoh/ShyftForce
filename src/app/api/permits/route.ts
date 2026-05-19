// Permit CRUD. Lists every permit in the org (agency + member). POST creates
// one. Managers + admins only; the dashboard widget surfaces these too.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { listPermits } from "@/lib/permits/service";
import { PERMIT_CATALOG, permitCategory } from "@/lib/permits/catalog";

const CreateSchema = z.object({
  memberId:        z.string().nullable().optional(),
  category:        z.enum(PERMIT_CATALOG.map(c => c.key) as any),
  customLabel:     z.string().max(120).optional().nullable(),
  regulator:       z.string().max(200).optional().nullable(),
  permitNumber:    z.string().max(120).optional().nullable(),
  issuedOn:        z.string().datetime().optional().nullable(),
  expiresOn:       z.string().datetime(),
  feeAmountCents:  z.number().int().min(0).max(1_000_000_00).optional().nullable(),
  renewalUrl:      z.string().url().max(500).optional().nullable(),
  blocksScheduling:z.boolean().optional(),
  fileUrl:         z.string().url().max(500).optional().nullable(),
  notes:           z.string().max(2000).optional().nullable(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await listPermits(u.organizationId);
  return NextResponse.json({ items, catalog: PERMIT_CATALOG });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Validate: custom requires customLabel; member-level vs agency-level
  const cat = permitCategory(parsed.data.category);
  if (parsed.data.category === "custom" && !parsed.data.customLabel?.trim()) {
    return NextResponse.json({ error: "Custom permits need a label" }, { status: 400 });
  }
  if (cat?.level === "agency" && parsed.data.memberId) {
    return NextResponse.json({ error: `${cat.label} is an agency-level permit; leave member blank.` }, { status: 400 });
  }
  if (cat?.level === "member" && !parsed.data.memberId) {
    return NextResponse.json({ error: `${cat.label} is per-employee; choose a member.` }, { status: 400 });
  }

  // Cross-tenant: member must be in this org
  if (parsed.data.memberId) {
    const m = await prisma.member.findFirst({
      where: { id: parsed.data.memberId, organizationId: u.organizationId },
      select: { id: true },
    });
    if (!m) return NextResponse.json({ error: "Member not in this org" }, { status: 404 });
  }

  const created = await prisma.permit.create({
    data: {
      organizationId: u.organizationId,
      memberId: parsed.data.memberId ?? null,
      category: parsed.data.category,
      customLabel: parsed.data.customLabel ?? null,
      regulator: parsed.data.regulator ?? cat?.hintRegulator ?? null,
      permitNumber: parsed.data.permitNumber ?? null,
      issuedOn: parsed.data.issuedOn ? new Date(parsed.data.issuedOn) : null,
      expiresOn: new Date(parsed.data.expiresOn),
      feeAmountCents: parsed.data.feeAmountCents ?? cat?.defaultFeeCents ?? null,
      renewalUrl: parsed.data.renewalUrl ?? cat?.hintRenewalUrl ?? null,
      blocksScheduling: parsed.data.blocksScheduling ?? true,
      fileUrl: parsed.data.fileUrl ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Permit", entityId: created.id,
    metadata: { category: created.category, memberId: created.memberId, expiresOn: created.expiresOn },
  });

  return NextResponse.json({ ok: true, permit: created });
}
