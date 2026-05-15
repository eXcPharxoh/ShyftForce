// GET /v1/members — list members in this org
import { prisma } from "@/lib/prisma";
import { withApiKey } from "@/lib/api-keys";

export const GET = withApiKey("read:members", async (req, { authed }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "active";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 500);

  const members = await prisma.member.findMany({
    where: { organizationId: authed.organizationId, status },
    include: { user: { select: { email: true, name: true } }, location: { select: { id: true, name: true } } },
    take: limit,
    orderBy: { user: { name: "asc" } },
  });
  return Response.json({
    data: members.map(m => ({
      id: m.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      position: m.position,
      status: m.status,
      hourlyRate: m.hourlyRate,
      hireDate: m.hireDate,
      location: m.location,
    })),
    count: members.length,
  });
});
