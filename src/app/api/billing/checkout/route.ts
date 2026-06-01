import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/session";
import { stripe, stripePricesForPlan, PLANS, type PlanKey } from "@/lib/stripe";
import { audit } from "@/lib/audit";

const Schema = z.object({
  plan: z.enum(["pro", "business"]),
}).strict();

export async function POST(req: Request) {
  // billing.write — managers don't get this by default; only admins or members
  // with a custom role that explicitly grants it can start a checkout session.
  const check = await checkPermission("billing.write");
  if (!check) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ("denied" in check) return NextResponse.json({ error: "You don't have billing permission." }, { status: 403 });
  const u = check.user;
  if (!process.env.STRIPE_SECRET_KEY) {
    // 503: the route is fine, the upstream dependency isn't wired. Distinguishes
    // a config gap from a real server crash in dashboards + telemetry.
    return NextResponse.json({ error: "Subscriptions aren't live on this workspace yet. Contact sales@shyftforce.com to be invoiced directly." }, { status: 503 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan. Choose pro or business." }, { status: 400 });
  const plan = parsed.data.plan as PlanKey;

  const prices = stripePricesForPlan(plan);
  if (!prices?.basePriceId) {
    return NextResponse.json({ error: `No Stripe price configured for plan "${plan}". Set STRIPE_PRICE_${plan.toUpperCase()}_BASE.` }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  // Count active members to seed the seat-overage quantity.
  const activeMembers = await prisma.member.count({
    where: { organizationId: org.id, status: "active" },
  });
  const def = PLANS[plan];
  const overageSeats = Math.max(0, activeMembers - def.includedSeats);

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

  // Build line items. Base is always quantity 1. Per-seat is only attached if
  // the plan has a per-seat price configured AND the org currently has overage.
  // (Customers with seats <= included still subscribe to the per-seat price at
  //  quantity 0 so Stripe can ramp it up automatically as they grow.)
  const lineItems: any[] = [
    { price: prices.basePriceId, quantity: 1 },
  ];
  if (prices.perSeatPriceId) {
    lineItems.push({ price: prices.perSeatPriceId, quantity: Math.max(0, overageSeats) });
  }

  const origin = (process.env.NEXTAUTH_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: lineItems,
    success_url: `${origin}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${origin}/settings/billing?canceled=true`,
    allow_promotion_codes: true,
    // Metadata on both session and subscription so the webhook can resolve
    // org from either checkout.session.completed or customer.subscription.*
    metadata: { organizationId: org.id, plan },
    subscription_data: { metadata: { organizationId: org.id, plan } },
  });

  await audit({
    organizationId: org.id, actorId: u.id, action: "billing.checkout",
    metadata: { plan, sessionId: session.id, includedSeats: def.includedSeats, overageSeats, activeMembers },
  });

  return NextResponse.json({ url: session.url });
}
