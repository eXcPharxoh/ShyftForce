// GET /api/reports/live-labor?window=today|now_4h|this_week
//   → { laborCents, revenueCents, pct|null, locations: [{ locationId, name, pct, status }] }
//
// Designed for lightweight client polling (15s) from the dashboard widget and
// the schedule header chip. Returns minimal payload — no recommendations.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { liveLabor, type LaborWindow } from "@/lib/pos/labor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const w = url.searchParams.get("window");
  const window: LaborWindow = w === "now_4h" || w === "this_week" ? w : "today";

  const snaps = await liveLabor({ organizationId: u.organizationId, window });
  const laborCents   = snaps.reduce((a, s) => a + s.laborCostCents, 0);
  const revenueCents = snaps.reduce((a, s) => a + s.grossSalesCents, 0);
  const pct = revenueCents > 0 ? +(laborCents / revenueCents * 100).toFixed(1) : null;

  return NextResponse.json({
    window,
    laborCents,
    revenueCents,
    pct,
    locations: snaps.map(s => ({
      locationId:   s.locationId,
      name:         s.locationName,
      pct:          s.laborPct,
      targetPct:    s.targetPct,
      status:       s.status,
      scheduledHrs: s.scheduledHours,
    })),
    at: new Date().toISOString(),
  });
}
