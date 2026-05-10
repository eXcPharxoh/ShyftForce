import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";
import { ensureDefaultPolicies, hoursForRequest } from "@/lib/pto/service";
import { audit } from "@/lib/audit";

const Schema = z.object({
  startsOn: z.string(),
  endsOn:   z.string(),
  category: z.string().default("vacation"),
  reason:   z.string().optional(),
});

export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await ensureDefaultPolicies(u.organizationId);
  const policy = await prisma.ptoPolicy.findUnique({
    where: { organizationId_category: { organizationId: u.organizationId, category: parsed.data.category } },
  });
  const startsOn = new Date(parsed.data.startsOn);
  const endsOn   = new Date(parsed.data.endsOn);
  const hoursRequested = hoursForRequest(startsOn, endsOn, policy?.hoursPerDay ?? 8);

  const r = await prisma.timeOffRequest.create({
    data: {
      memberId: u.memberId,
      startsOn, endsOn,
      category: parsed.data.category,
      reason:   parsed.data.reason,
      hoursRequested,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "time_off.create", entityType: "TimeOffRequest", entityId: r.id,
    metadata: { category: parsed.data.category, hoursRequested },
  });
  return NextResponse.json(r);
}
