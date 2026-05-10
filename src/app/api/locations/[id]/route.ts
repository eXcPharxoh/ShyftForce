import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const data = await req.json();
  const allowed = ["name", "weeklyBudget", "projectedRevenue", "latitude", "longitude", "geofenceRadiusMeters"] as const;
  const update: any = {};
  for (const k of allowed) if (k in data) update[k] = data[k];

  // Defense: must belong to this org
  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const r = await prisma.location.update({ where: { id }, data: update });
  return NextResponse.json(r);
}
