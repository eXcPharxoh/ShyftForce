import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set in .env");
  _stripe = new Stripe(key, { apiVersion: "2024-11-20.acacia" as any });
  return _stripe;
}

export const PLAN_LIMITS = {
  trial:      { seats: 999, label: "14-day Trial",  monthlyPriceUSD: 0   },
  starter:    { seats: 10,  label: "Starter",       monthlyPriceUSD: 29  },
  pro:        { seats: 100, label: "Pro",           monthlyPriceUSD: 79  },
  enterprise: { seats: 9999, label: "Enterprise",   monthlyPriceUSD: 0   },
} as const;
export type PlanKey = keyof typeof PLAN_LIMITS;

// Map plan key → Stripe Price ID. You'll set these env vars after creating
// products in Stripe (see PRODUCTION_CHECKLIST.md).
export function priceIdForPlan(plan: PlanKey): string | null {
  switch (plan) {
    case "starter": return process.env.STRIPE_PRICE_STARTER ?? null;
    case "pro":     return process.env.STRIPE_PRICE_PRO     ?? null;
    default:        return null;
  }
}
