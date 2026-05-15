// Keeps a Stripe subscription's per-seat overage line in sync with the org's
// actual active member count. Called whenever members are added/removed/changed
// so customers see accurate proration on their next invoice.
//
// Failures are non-fatal — we never block a member CRUD operation on Stripe.
import { prisma } from "@/lib/prisma";
import { stripe, stripePricesForPlan, PLANS, normalizePlanKey } from "@/lib/stripe";

export async function syncSeatsForOrg(organizationId: string): Promise<{ ok: boolean; skipped?: string; activeSeats?: number; overage?: number }> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, plan: true, stripeSubscriptionId: true },
    });
    if (!org) return { ok: false, skipped: "org not found" };
    if (!org.stripeSubscriptionId) return { ok: true, skipped: "no Stripe subscription (free plan or not yet upgraded)" };
    if (!process.env.STRIPE_SECRET_KEY) return { ok: true, skipped: "STRIPE_SECRET_KEY not configured" };

    const planKey = normalizePlanKey(org.plan);
    const def = PLANS[planKey];
    const prices = stripePricesForPlan(planKey);
    if (!prices?.perSeatPriceId) return { ok: true, skipped: "no per-seat price configured for this plan" };

    const activeSeats = await prisma.member.count({
      where: { organizationId, status: "active" },
    });
    const overage = Math.max(0, activeSeats - def.includedSeats);

    const sub = await stripe().subscriptions.retrieve(org.stripeSubscriptionId);
    const seatItem = sub.items.data.find(i => i.price.id === prices.perSeatPriceId);

    if (seatItem) {
      if (seatItem.quantity === overage) return { ok: true, activeSeats, overage }; // already in sync
      await stripe().subscriptionItems.update(seatItem.id, {
        quantity: overage,
        proration_behavior: "create_prorations",
      });
    } else if (overage > 0) {
      // Subscription was created before the per-seat line existed — attach it now.
      await stripe().subscriptionItems.create({
        subscription: sub.id,
        price: prices.perSeatPriceId,
        quantity: overage,
        proration_behavior: "create_prorations",
      });
    }

    return { ok: true, activeSeats, overage };
  } catch (e: any) {
    console.error("[syncSeatsForOrg] failed:", e?.message ?? e);
    return { ok: false, skipped: e?.message ?? "stripe error" };
  }
}
