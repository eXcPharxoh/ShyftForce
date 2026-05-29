// Owner-only PATCH for the per-workspace security toggles:
//   require2fa            — when true, members without TOTP can't use the app
//   requireEmailVerified  — when true, members with emailVerified=null can't either
// GET returns the current values + live counts so the toggle UI can warn the
// owner before flipping a switch that will lock people out.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  require2fa:           z.boolean().optional(),
  requireEmailVerified: z.boolean().optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const [org, activeMembers, twoFactorEnrolled, emailVerified] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: u.organizationId },
      select: { require2fa: true, requireEmailVerified: true },
    }),
    prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } }),
    prisma.member.count({
      where: { organizationId: u.organizationId, status: "active", user: { totpEnabled: true } },
    }),
    prisma.member.count({
      where: { organizationId: u.organizationId, status: "active", user: { emailVerified: { not: null } } },
    }),
  ]);
  return NextResponse.json({
    require2fa:           org?.require2fa ?? false,
    requireEmailVerified: org?.requireEmailVerified ?? false,
    activeMembers,
    twoFactorEnrolled,
    emailVerified,
  });
}

export async function PATCH(req: Request) {
  const u = await requireUser();
  if (u.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an owner can change this." }, { status: 403 });
  }
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.organization.update({
    where: { id: u.organizationId },
    data: parsed.data,
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Organization", entityId: u.organizationId,
    metadata: parsed.data,
  });
  return NextResponse.json({ ok: true });
}
