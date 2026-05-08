import "next-auth";
declare module "next-auth" {
  interface Session {
    memberId?: string;
    role?: "ADMIN" | "MANAGER" | "EMPLOYEE";
    organizationId?: string;
    organizationName?: string;
    locationId?: string | null;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    memberId?: string;
    role?: "ADMIN" | "MANAGER" | "EMPLOYEE";
    organizationId?: string;
    organizationName?: string;
    locationId?: string | null;
  }
}
