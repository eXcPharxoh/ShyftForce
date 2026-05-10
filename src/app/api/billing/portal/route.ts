import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
  if (!org?.stripeCustomerId) return NextResponse.json({ error: "No billing account yet — start a subscription first." }, { status: 400 });

  const origin = (process.env.NEXTAUTH_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const session = await stripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });
  return NextResponse.json({ url: session.url });
}
