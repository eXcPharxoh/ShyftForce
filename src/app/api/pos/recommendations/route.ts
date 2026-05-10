import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "@/lib/session";
import { recommendSendHome } from "@/lib/pos/recommender";
import { prisma } from "@/lib/prisma";

// GET /api/pos/recommendations?location=<id>&minStaff=1
export async function GET(req: Request) {
  const u = await requireManagerOrAdmin();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("location");
  const minStaff = parseInt(url.searchParams.get("minStaff") ?? "1", 10);

  if (locationId) {
    const recs = await recommendSendHome({ organizationId: u.organizationId, locationId, minStaffPerPosition: minStaff });
    return NextResponse.json({ locationId, recommendations: recs });
  }

  // Fan out across every location
  const locs = await prisma.location.findMany({ where: { organizationId: u.organizationId } });
  const allRecs: any[] = [];
  for (const l of locs) {
    const recs = await recommendSendHome({ organizationId: u.organizationId, locationId: l.id, minStaffPerPosition: minStaff });
    for (const r of recs) allRecs.push({ ...r, locationId: l.id, locationName: l.name });
  }
  return NextResponse.json({ recommendations: allRecs });
}
