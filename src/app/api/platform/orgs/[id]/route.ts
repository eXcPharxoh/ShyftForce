// Platform admin: update an organization (plan, subscription status, trial,
// name, industry, demo flag), or delete it entirely (cascades).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRealSessionUser } from "@/lib/session";
import { isPlatformAdminEmail } from "@/lib/platform/admin";
import { audit } from "@/lib/audit";

const PatchSchema = z.object({
  name:               z.string().min(2).max(80).optional(),
  industry:           z.string().max(40).nullable().optional(),
  plan:               z.enum(["trial", "starter", "pro", "enterprise"]).optional(),
  subscriptionStatus: z.enum(["active", "past_due", "canceled", "incomplete"]).nullable().optional(),
  trialEndsAt:        z.string().datetime().nullable().optional(),
  timezone:           z.string().max(60).optional(),
  isDemo:             z.boolean().optional(),
}).strict();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const real = await getRealSessionUser();
  if (!real || !isPlatformAdminEmail(real.email)) {
    return NextResponse.json({ error: "platform admin only" }, { status: 403 });
  }
  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true, locations: true, payPeriods: true } },
    },
  });
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(org);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const real = await getRealSessionUser();
  if (!real || !isPlatformAdminEmail(real.email)) {
    return NextResponse.json({ error: "platform admin only" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.organization.findUnique({ where: { id }, select: { id: true, plan: true, subscriptionStatus: true } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data: any = { ...parsed.data };
  if (parsed.data.trialEndsAt !== undefined) {
    data.trialEndsAt = parsed.data.trialEndsAt ? new Date(parsed.data.trialEndsAt) : null;
  }

  try {
    const updated = await prisma.organization.update({ where: { id }, data });
    await audit({
      organizationId: id, actorId: real.id,
      action: parsed.data.plan && parsed.data.plan !== existing.plan ? "org.upgrade_plan" : "org.update",
      entityType: "Organization", entityId: id,
      metadata: { byPlatformAdmin: real.email, changes: parsed.data, from: { plan: existing.plan, status: existing.subscriptionStatus } },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("[platform/orgs/:id] update failed", e);
    return NextResponse.json({ error: "Failed to update organization." }, { status: 500 });
  }
}

// Permanent deletion — cascades through every related model via onDelete: Cascade.
// Require explicit ?confirm=<org slug> in the query string as a safety belt.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const real = await getRealSessionUser();
  if (!real || !isPlatformAdminEmail(real.email)) {
    return NextResponse.json({ error: "platform admin only" }, { status: 403 });
  }
  const { id } = await params;
  const url = new URL(req.url);
  const confirm = url.searchParams.get("confirm");

  const existing = await prisma.organization.findUnique({ where: { id }, select: { id: true, slug: true, name: true, isDemo: true } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (confirm !== existing.slug) {
    return NextResponse.json({
      error: `To confirm deletion, pass ?confirm=${existing.slug}`,
      hint: "This permanently deletes the org and EVERY record in it (members, shifts, logs). There is no undo.",
    }, { status: 400 });
  }

  try {
    await prisma.organization.delete({ where: { id } });
    // We can't audit to this org anymore — write a final note attached to a sentinel org or just log it.
    console.warn(`[platform] DELETED org id=${id} slug=${existing.slug} name=${existing.name} byAdmin=${real.email}`);
    return NextResponse.json({ ok: true, deleted: { id, slug: existing.slug, name: existing.name } });
  } catch (e: any) {
    console.error("[platform/orgs/:id] delete failed", e);
    return NextResponse.json({ error: "Failed to delete organization." }, { status: 500 });
  }
}
