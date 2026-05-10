import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { stripe, priceIdForPlan, type PlanKey } from "@/lib/stripe";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured. Set STRIPE_SECRET_KEY in .env." }, { status: 500 });
  }
  const { plan } = await req.json() as { plan: PlanKey };
  const priceId = priceIdForPlan(plan);
  if (!priceId) return NextResponse.json({ error: `No Stripe price configured for plan "${plan}". Set STRIPE_PRICE_${plan.toUpperCase()}.` }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  // Ensure Stripe customer exists
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: u.email, name: u.name,
      metadata: { organizationId: org.id, organizationName: org.name },
    });
    customerId = customer.id;
    await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
  }

  const origin = (process.env.NEXTAUTH_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings/billing?success=true&session={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/settings/billing?canceled=true`,
    allow_promotion_codes: true,
    subscription_data: { metadata: { organizationId: org.id } },
  });

  await audit({
    organizationId: org.id, actorId: u.id, action: "billing.checkout",
    metadata: { plan, sessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
