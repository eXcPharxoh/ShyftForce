// GET /v1/time-off — list time-off requests in this org
import { prisma } from "@/lib/prisma";
import { withApiKey } from "@/lib/api-keys";

export const GET = withApiKey("read:time_off", async (req, { authed }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const from   = url.searchParams.get("from");
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 500);

  const where: any = { member: { organizationId: authed.organizationId } };
  if (status) where.status = status;
  if (from)   where.startsOn = { gte: new Date(from) };

  const requests = await prisma.timeOffRequest.findMany({
    where, take: limit, orderBy: { createdAt: "desc" },
    include: { member: { select: { id: true, user: { select: { name: true, email: true } } } } },
  });
  return Response.json({
    data: requests.map(r => ({
      id: r.id,
      memberId: r.memberId,
      memberName: r.member.user.name,
      startsOn: r.startsOn,
      endsOn:   r.endsOn,
      category: r.category,
      status:   r.status,
      reason:   r.reason,
      hoursRequested: r.hoursRequested,
      hoursDeducted:  r.hoursDeducted,
      createdAt:      r.createdAt,
    })),
    count: requests.length,
  });
});
