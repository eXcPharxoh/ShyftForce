import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  memberId: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  organizationId: string;
  organizationName: string;
  locationId?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
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
    locationId: s.locationId,
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
