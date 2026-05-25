import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { orgHasFeature, type FeatureFlag } from "./stripe";

/**
 * Server-side feature gate for API route handlers. Returns a 403 NextResponse
 * when the org's plan (or platform-admin override) doesn't include `feature`,
 * or null when access is allowed. orgHasFeature() already resolves overrides →
 * plan (trial = business), so this is the single enforcement point.
 *
 * Usage in a route:
 *   const denied = await featureGuard(u.organizationId, "earned_wage_access");
 *   if (denied) return denied;
 */
export async function featureGuard(orgId: string, feature: FeatureFlag): Promise<NextResponse | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, trialEndsAt: true, featureOverrides: true },
  });
  if (!org || !orgHasFeature(org, feature)) {
    return NextResponse.json(
      {
        error: "This feature isn't included in your current plan.",
        feature,
        upgradeUrl: "/settings/billing",
      },
      { status: 403 },
    );
  }
  return null;
}
