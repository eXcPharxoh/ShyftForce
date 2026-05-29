import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "@/lib/session";
import { featureGuard } from "@/lib/feature-guard";
import { distributeTips, type DistributionRule } from "@/lib/tips/distribute";
import { z } from "zod";

const Schema = z.object({
  locationId: z.string(),
  date: z.string(),
  totalTipsCents: z.number().int().nonnegative(),
  distributionRule: z.enum(["hours", "role_weighted", "equal", "custom"]).default("hours"),
  includePositions: z.array(z.string()).optional(),
});

// POST /api/tips/preview — same as POST /api/tips but doesn't persist
export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const denied = await featureGuard(u.organizationId, "tip_management");
  if (denied) return denied;
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const result = await distributeTips({
    organizationId: u.organizationId,
    locationId: parsed.data.locationId,
    date: new Date(`${parsed.data.date}T00:00:00`),
    totalTipsCents: parsed.data.totalTipsCents,
    rule: parsed.data.distributionRule as DistributionRule,
    includePositions: parsed.data.includePositions,
  });
  return NextResponse.json(result);
}
