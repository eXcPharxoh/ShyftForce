import { NextResponse } from "next/server";
import { getRealSessionUser } from "@/lib/session";
import { isPlatformAdminEmail, startImpersonation, endImpersonation } from "@/lib/platform/admin";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  targetUserId: z.string(),
  reason: z.string().max(280).nullable().optional(),
});

// POST /api/platform/impersonate — start impersonation. Requires platform admin.
export async function POST(req: Request) {
  const real = await getRealSessionUser();
  if (!real) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isPlatformAdminEmail(real.email)) {
    return NextResponse.json({ error: "platform admin only" }, { status: 403 });
  }
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  try {
    const grant = await startImpersonation({
      adminUserId: real.id,
      adminEmail: real.email,
      targetUserId: parsed.data.targetUserId,
      reason: parsed.data.reason ?? undefined,
    });
    // Audit at the TARGET org level so the audit shows up in their org's audit log too
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.targetUserId },
      include: { member: true },
    });
    if (target?.member) {
      await audit({
        organizationId: target.member.organizationId,
        actorId: real.id,
        action: "user.login",
        entityType: "ImpersonationGrant",
        entityId: grant.id,
        metadata: { impersonated: parsed.data.targetUserId, by: real.email, reason: parsed.data.reason ?? null },
      });
    }
    return NextResponse.json({ ok: true, grantId: grant.id, expiresAt: grant.expiresAt });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "failed" }, { status: 400 });
  }
}

// DELETE /api/platform/impersonate — end impersonation
export async function DELETE() {
  await endImpersonation();
  return NextResponse.json({ ok: true });
}
