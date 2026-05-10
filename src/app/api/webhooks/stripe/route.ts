import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { audit } from "@/lib/audit";

// Stripe sends signed webhooks. We verify with STRIPE_WEBHOOK_SECRET.
// Local dev: use `stripe listen --forward-to localhost:3210/api/webhooks/stripe`
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e: any) {
    return NextResponse.json({ error: `signature: ${e.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s: any = event.data.object;
      const orgId = s.subscription_data?.metadata?.organizationId
                 ?? s.metadata?.organizationId;
      if (s.subscription && orgId) {
        const sub: any = await stripe().subscriptions.retrieve(s.subscription);
        const plan = derivePlanFromSub(sub);
        await prisma.organization.update({
          where: { id: orgId },
          data: {
            stripeSubscriptionId: s.subscription,
            stripeCustomerId:     s.customer,
            plan,
            subscriptionStatus:   sub.status,
            trialEndsAt:          sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
        });
        await audit({ organizationId: orgId, action: "billing.subscription_active", metadata: { plan, subStatus: sub.status } });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub: any = event.data.object;
      const orgId = sub.metadata?.organizationId;
      if (orgId) {
        const plan = derivePlanFromSub(sub);
        await prisma.organization.update({
          where: { id: orgId },
          data: { stripeSubscriptionId: sub.id, plan, subscriptionStatus: sub.status },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub: any = event.data.object;
      const orgId = sub.metadata?.organizationId;
      if (orgId) {
        await prisma.organization.update({
          where: { id: orgId },
          data: { plan: "trial", subscriptionStatus: "canceled" },
        });
        await audit({ organizationId: orgId, action: "billing.subscription_canceled" });
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}

function derivePlanFromSub(sub: any): string {
  const priceId: string = sub?.items?.data?.[0]?.price?.id ?? "";
  if (priceId === process.env.STRIPE_PRICE_PRO)     return "pro";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  return "starter";
}
