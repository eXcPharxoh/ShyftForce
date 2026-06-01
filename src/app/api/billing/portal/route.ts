import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/session";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  // billing.write — opening the portal lets the user change card / cancel plan
  const check = await checkPermission("billing.write");
  if (!check) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ("denied" in check) return NextResponse.json({ error: "You don't have billing permission." }, { status: 403 });
  const u = check.user;
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Subscriptions aren't live on this workspace yet." }, { status: 503 });
  }
  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
  if (!org?.stripeCustomerId) return NextResponse.json({ error: "No billing account yet — start a subscription first." }, { status: 400 });

  const origin = (process.env.NEXTAUTH_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const session = await stripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });
  return NextResponse.json({ url: session.url });
}
