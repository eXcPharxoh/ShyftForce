import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { featureGuard } from "@/lib/feature-guard";
import { liveLabor, type LaborWindow } from "@/lib/pos/labor";

const VALID: LaborWindow[] = ["today", "now_4h", "this_week"];

export async function GET(req: Request) {
  const u = await requireUser();
  const denied = await featureGuard(u.organizationId, "pos_integrations");
  if (denied) return denied;
  const url = new URL(req.url);
  const w = (url.searchParams.get("window") ?? "today") as LaborWindow;
  if (!VALID.includes(w)) return NextResponse.json({ error: "invalid window" }, { status: 400 });

  const snapshots = await liveLabor({ organizationId: u.organizationId, window: w });
  return NextResponse.json({
    window: w,
    org: { totalLaborCents: snapshots.reduce((a, s) => a + s.laborCostCents, 0), totalRevenueCents: snapshots.reduce((a, s) => a + s.grossSalesCents, 0) },
    locations: snapshots,
  });
}
