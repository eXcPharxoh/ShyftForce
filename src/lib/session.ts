import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { getActiveImpersonation } from "./platform/admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  memberId: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  organizationId: string;
  organizationName: string;
  organizationIndustry: string | null;
  locationId?: string | null;
  // Impersonation: set when a platform admin is acting as this user.
  impersonatedByUserId?: string | null;
  impersonatedByEmail?: string | null;
};

/** Returns the effective user for the request.
 *  Honors active impersonation: if a platform admin has started impersonation,
 *  every page sees them as the target user (with impersonatedByUserId set so
 *  audit logs + banner know to attribute back to the real admin). */
export async function getSessionUser(): Promise<SessionUser | null> {
  // 1) Check impersonation first — overrides everything when active
  const imp = await getActiveImpersonation();
  if (imp) {
    const target = await prisma.user.findUnique({
      where: { id: imp.targetUserId },
      include: { member: { include: { organization: true, location: true } } },
    });
    if (target?.member) {
      return {
        id: target.id,
        email: target.email,
        name: target.name,
        image: target.avatar,
        memberId: target.member.id,
        role: target.member.role as any,
        organizationId: target.member.organizationId,
        organizationName: target.member.organization.name,
        organizationIndustry: target.member.organization.industry,
        locationId: target.member.locationId,
        impersonatedByUserId: imp.adminUserId,
        impersonatedByEmail: imp.adminUserEmail,
      };
    }
    // Target user has no member — fall through to real session
  }

  // 2) Normal session
  const s: any = await getServerSession(authOptions);
  if (!s || !s.user || !s.memberId) return null;
  return {
    id: s.user?.id ?? "",
    email: s.user?.email ?? "",
    name: s.user?.name ?? "",
    image: s.user?.image ?? null,
    memberId: s.memberId,
    role: s.role,
    organizationId: s.organizationId,
    organizationName: s.organizationName,
    organizationIndustry: s.organizationIndustry ?? null,
    locationId: s.locationId,
    impersonatedByUserId: null,
    impersonatedByEmail: null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireManagerOrAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN" && u.role !== "MANAGER") redirect("/dashboard");
  return u;
}

/** Returns the REAL session user (ignoring impersonation). Used for /platform routes. */
export async function getRealSessionUser(): Promise<SessionUser | null> {
  const s: any = await getServerSession(authOptions);
  if (!s || !s.user || !s.memberId) return null;
  return {
    id: s.user?.id ?? "",
    email: s.user?.email ?? "",
    name: s.user?.name ?? "",
    image: s.user?.image ?? null,
    memberId: s.memberId,
    role: s.role,
    organizationId: s.organizationId,
    organizationName: s.organizationName,
    organizationIndustry: s.organizationIndustry ?? null,
    locationId: s.locationId,
  };
}
