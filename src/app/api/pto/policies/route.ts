import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { ensureDefaultPolicies } from "@/lib/pto/service";

export async function GET() {
  const u = await requireManagerOrAdmin();
  await ensureDefaultPolicies(u.organizationId);
  const policies = await prisma.ptoPolicy.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ policies });
}
