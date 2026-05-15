import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set in .env");
  _stripe = new Stripe(key, { apiVersion: "2024-11-20.acacia" as any });
  return _stripe;
}

/**
 * Pricing model: a flat monthly base + a per-seat overage above an "included
 * seats" allowance. Three reasons:
 *   - small teams see a low sticker price ($29/mo Pro vs ~$112/mo at Deputy)
 *   - growth is rewarded with feature value, not penalized with a steep per-seat tax
 *   - the marginal cost of an extra employee scales with the tier they pay for
 *
 * Reference points (researched 2026):
 *   When I Work : $2.50–$8 per seat, no base
 *   7shifts     : $35–$150 per LOCATION, unlimited employees
 *   Deputy      : $4.50–$6 per seat, $25 minimum
 *   Homebase    : free tier (loss leader) → $20–$80 per location
 *   Connecteam  : $29 base + 30 free seats + $0.50–$3 overage (closest to ours)
 *
 * Ours: hybrid base + per-seat overage, with a generous Free tier as the
 * top-of-funnel weapon. Pro/Business include enough seats for typical SMBs;
 * larger teams pay a $4/$6 marginal seat — half what When I Work charges.
 */

export type PlanKey = "free" | "pro" | "business" | "enterprise";

export type FeatureFlag =
  | "ai_copilot"
  | "auto_scheduler"
  | "compliance_autopilot"
  | "open_shift_marketplace"
  | "geofenced_clock_in"
  | "payroll_push"
  | "advanced_reports"
  | "worker_network"
  | "earned_wage_access"
  | "pos_integrations"
  | "client_billing"
  | "tip_management"
  | "predictability_pay"
  | "audit_log"
  | "sso"
  | "custom_sla"
  | "dedicated_csm"
  | "on_prem";

export type PlanDefinition = {
  key:             PlanKey;
  label:           string;
  tagline:         string;
  basePriceUSD:    number;            // monthly base; 0 = free
  includedSeats:   number;            // seats covered by the base
  perSeatUSD:      number;            // marginal cost per seat beyond includedSeats
  maxLocations:    number;            // hard cap; 9999 = unlimited
  maxMembersHard:  number;            // 9999 = unlimited (only Free uses a hard cap)
  features:        FeatureFlag[];
  contactSalesOnly?: boolean;
  popular?:        boolean;
};

const PRO_FEATURES: FeatureFlag[] = [
  "ai_copilot",
  "auto_scheduler",
  "compliance_autopilot",
  "open_shift_marketplace",
  "geofenced_clock_in",
  "payroll_push",
  "advanced_reports",
  "audit_log",
];

const BUSINESS_FEATURES: FeatureFlag[] = [
  ...PRO_FEATURES,
  "worker_network",
  "earned_wage_access",
  "pos_integrations",
  "client_billing",
  "tip_management",
  "predictability_pay",
];

const ENTERPRISE_FEATURES: FeatureFlag[] = [
  ...BUSINESS_FEATURES,
  "sso",
  "custom_sla",
  "dedicated_csm",
  "on_prem",
];

export const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: "free",
    label: "Free",
    tagline: "Forever-free for small teams getting started",
    basePriceUSD:    0,
    includedSeats:   5,
    perSeatUSD:      0,            // No overage — Free is hard-capped
    maxLocations:    1,
    maxMembersHard:  5,
    features: [], // Core scheduling + clock + messenger only
  },
  pro: {
    key: "pro",
    label: "Pro",
    tagline: "Everything you need to run a small business",
    basePriceUSD:    29,
    includedSeats:   5,
    perSeatUSD:      4,
    maxLocations:    3,
    maxMembersHard:  9999,
    features: PRO_FEATURES,
    popular: true,
  },
  business: {
    key: "business",
    label: "Business",
    tagline: "Multi-location ops with payroll, POS, and the cross-employer network",
    basePriceUSD:    79,
    includedSeats:   15,
    perSeatUSD:      6,
    maxLocations:    9999,
    maxMembersHard:  9999,
    features: BUSINESS_FEATURES,
  },
  enterprise: {
    key: "enterprise",
    label: "Enterprise",
    tagline: "SSO, custom SLA, volume discounts",
    basePriceUSD:    0,
    includedSeats:   0,
    perSeatUSD:      0,
    maxLocations:    9999,
    maxMembersHard:  9999,
    features: ENTERPRISE_FEATURES,
    contactSalesOnly: true,
  },
};

// Back-compat shim so the rest of the app keeps compiling while we migrate.
// New code should reach for PLANS directly.
export const PLAN_LIMITS = {
  free:       { label: PLANS.free.label,       seats: PLANS.free.maxMembersHard,       monthlyPriceUSD: PLANS.free.basePriceUSD       },
  pro:        { label: PLANS.pro.label,        seats: PLANS.pro.maxMembersHard,        monthlyPriceUSD: PLANS.pro.basePriceUSD        },
  business:   { label: PLANS.business.label,   seats: PLANS.business.maxMembersHard,   monthlyPriceUSD: PLANS.business.basePriceUSD   },
  enterprise: { label: PLANS.enterprise.label, seats: PLANS.enterprise.maxMembersHard, monthlyPriceUSD: PLANS.enterprise.basePriceUSD },
  // Aliases for orgs created before the rename
  trial:      { label: "Free",                 seats: PLANS.free.maxMembersHard,       monthlyPriceUSD: 0                              },
  starter:    { label: PLANS.pro.label,        seats: PLANS.pro.maxMembersHard,        monthlyPriceUSD: PLANS.pro.basePriceUSD        },
} as const;

// ---------- Cost calculation ----------

export type CostBreakdown = {
  plan:          PlanKey;
  seats:         number;
  basePriceUSD:  number;
  includedSeats: number;
  overageSeats:  number;
  perSeatUSD:    number;
  overageUSD:    number;
  totalUSD:      number;
};

/** Monthly cost for a given plan + active seat count. */
export function calculateMonthlyCost(plan: PlanKey, seats: number): CostBreakdown {
  const def = PLANS[plan];
  const overageSeats = Math.max(0, seats - def.includedSeats);
  const overageUSD   = overageSeats * def.perSeatUSD;
  return {
    plan,
    seats,
    basePriceUSD:  def.basePriceUSD,
    includedSeats: def.includedSeats,
    overageSeats,
    perSeatUSD:    def.perSeatUSD,
    overageUSD,
    totalUSD:      def.basePriceUSD + overageUSD,
  };
}

/** Does a given plan include a feature flag? */
export function planHasFeature(plan: PlanKey | string | null | undefined, feature: FeatureFlag): boolean {
  return PLANS[normalizePlanKey(plan)].features.includes(feature);
}

/** Maps legacy plan strings ("trial", "starter") to a current PlanKey. */
export function normalizePlanKey(plan: PlanKey | string | null | undefined): PlanKey {
  if (!plan) return "free";
  switch (plan) {
    case "free":
    case "pro":
    case "business":
    case "enterprise":
      return plan;
    case "trial":   return "free"; // old free-tier name
    case "starter": return "pro";  // old entry-paid tier maps to Pro
    default:        return "free";
  }
}

// ---------- Stripe price IDs ----------
// Two prices per paid plan in Stripe:
//   1. Base (flat monthly fee)
//   2. Per-seat overage (quantity-based price item, scaled by extra seats)
// Both attach to the same subscription so customers see one invoice.

export type StripePricePair = { basePriceId: string; perSeatPriceId: string | null };

export function stripePricesForPlan(plan: PlanKey): StripePricePair | null {
  switch (plan) {
    case "pro": return {
      // STRIPE_PRICE_PRO is the legacy single-line env var; keep it as fallback.
      basePriceId:    process.env.STRIPE_PRICE_PRO_BASE ?? process.env.STRIPE_PRICE_PRO ?? "",
      perSeatPriceId: process.env.STRIPE_PRICE_PRO_SEAT ?? null,
    };
    case "business": return {
      basePriceId:    process.env.STRIPE_PRICE_BUSINESS_BASE ?? "",
      perSeatPriceId: process.env.STRIPE_PRICE_BUSINESS_SEAT ?? null,
    };
    case "free":
    case "enterprise":
    default:
      return null;
  }
}

// Back-compat for older callers using the single-line flow.
export function priceIdForPlan(plan: PlanKey | string): string | null {
  const normalized = normalizePlanKey(plan);
  return stripePricesForPlan(normalized)?.basePriceId || null;
}
