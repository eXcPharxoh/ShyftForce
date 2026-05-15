// Platform admin (super-admin) authorization + impersonation helpers.
// A platform admin is someone whose email is in PLATFORM_ADMIN_EMAILS env var
// (comma-separated). They get a /platform dashboard that sees ALL orgs across
// the tenant boundary, and they can "Login as" any user via an audited cookie.

import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const IMPERSONATION_COOKIE = "sf_impersonate";
const MAX_IMPERSONATION_HOURS = 4;

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) {
    // SAFETY NET: if no admin emails configured, deny everyone except in dev.
    return false;
  }
  return allowed.includes(email.toLowerCase());
}

export type ImpersonationContext = {
  grantId: string;
  adminUserId: string;
  adminUserEmail: string;
  targetUserId: string;
  startedAt: Date;
};

/** Read the impersonation cookie + validate against DB. Returns the active grant
 *  if one is in effect for this request, or null. Self-heals expired grants. */
export async function getActiveImpersonation(): Promise<ImpersonationContext | null> {
  const c = await cookies();
  const grantId = c.get(IMPERSONATION_COOKIE)?.value;
  if (!grantId) return null;
  const grant = await prisma.impersonationGrant.findUnique({
    where: { id: grantId },
    include: { adminUser: { select: { email: true } } },
  });
  if (!grant) return null;
  if (grant.endedAt) return null;
  if (grant.expiresAt < new Date()) {
    // Auto-end expired grants
    await prisma.impersonationGrant.update({
      where: { id: grant.id },
      data: { endedAt: new Date() },
    });
    return null;
  }
  return {
    grantId: grant.id,
    adminUserId: grant.adminUserId,
    adminUserEmail: grant.adminUser.email,
    targetUserId: grant.targetUserId,
    startedAt: grant.startedAt,
  };
}

/** Start an impersonation session. Only callable by platform admins. */
export async function startImpersonation(opts: {
  adminUserId: string;
  adminEmail: string;
  targetUserId: string;
  reason?: string;
}) {
  if (!isPlatformAdminEmail(opts.adminEmail)) {
    throw new Error("not a platform admin");
  }
  if (opts.adminUserId === opts.targetUserId) {
    throw new Error("cannot impersonate yourself");
  }
  const target = await prisma.user.findUnique({ where: { id: opts.targetUserId } });
  if (!target) throw new Error("target user not found");

  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  const grant = await prisma.impersonationGrant.create({
    data: {
      adminUserId: opts.adminUserId,
      targetUserId: opts.targetUserId,
      expiresAt: new Date(Date.now() + MAX_IMPERSONATION_HOURS * 3600_000),
      reason: opts.reason ?? null,
      ipAddress,
      userAgent,
    },
  });

  const c = await cookies();
  c.set(IMPERSONATION_COOKIE, grant.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_IMPERSONATION_HOURS * 3600,
    path: "/",
    // Share across subdomains in production (admin starts the grant, app reads it)
    domain: process.env.NEXTAUTH_COOKIE_DOMAIN || undefined,
  });

  return grant;
}

/** End the active impersonation. Always safe to call. */
export async function endImpersonation(opts: { adminUserId?: string } = {}) {
  const c = await cookies();
  const grantId = c.get(IMPERSONATION_COOKIE)?.value;
  if (grantId) {
    await prisma.impersonationGrant.updateMany({
      where: { id: grantId, endedAt: null },
      data: { endedAt: new Date() },
    });
  }
  c.set(IMPERSONATION_COOKIE, "", {
    path: "/",
    maxAge: 0,
    domain: process.env.NEXTAUTH_COOKIE_DOMAIN || undefined,
  });
}
