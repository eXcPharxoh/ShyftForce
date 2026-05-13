import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRealSessionUser } from "@/lib/session";
import { isPlatformAdminEmail } from "@/lib/platform/admin";

// GET /api/platform/users?q=email-or-name&org=<id>
export async function GET(req: Request) {
  const real = await getRealSessionUser();
  if (!real || !isPlatformAdminEmail(real.email)) {
    return NextResponse.json({ error: "platform admin only" }, { status: 403 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const orgFilter = url.searchParams.get("org");
  const where: any = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name:  { contains: q, mode: "insensitive" } },
    ];
  }
  if (orgFilter) where.member = { organizationId: orgFilter };

  const users = await prisma.user.findMany({
    where,
    include: {
      member: { include: { organization: { select: { id: true, name: true, slug: true, plan: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      emailVerified: u.emailVerified,
      lockedUntil: u.lockedUntil,
      failedLoginAttempts: u.failedLoginAttempts,
      org: u.member?.organization
        ? { id: u.member.organization.id, name: u.member.organization.name, slug: u.member.organization.slug, plan: u.member.organization.plan, memberRole: u.member.role }
        : null,
    })),
  });
}
