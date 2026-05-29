import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { featureGuard } from "@/lib/feature-guard";
import { getEwaBalance } from "@/lib/ewa/calc";

// GET /api/ewa/balance → the current user's earned-but-unpaid figures
export async function GET() {
  const u = await requireUser();
  const denied = await featureGuard(u.organizationId, "earned_wage_access");
  if (denied) return denied;
  const bal = await getEwaBalance({ memberId: u.memberId, organizationId: u.organizationId });
  return NextResponse.json(bal);
}
