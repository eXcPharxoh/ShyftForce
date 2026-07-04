// Resend the email-verification link to the signed-in user. Backs the
// "Resend link" action in the verify-email banner, which previously pointed at
// /verify-email with no token and just showed "Missing token".
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { randomBytes } from "node:crypto";
import { Email, sendEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const u = await requireUser();

  // Coarse throttle so the button can't be used to spam someone's inbox.
  const rl = rateLimit({ key: `verify-resend:${u.id}:${clientIp(req)}`, max: 3, windowMs: 15 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "You've requested this a few times — please wait a few minutes and check your inbox (and spam)." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { id: u.id }, select: { email: true, name: true, emailVerified: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  // One active token per user: drop prior unconsumed ones, then mint a fresh one.
  await prisma.emailVerification.deleteMany({ where: { userId: u.id, consumedAt: null } });
  const token = randomBytes(32).toString("hex");
  await prisma.emailVerification.create({
    data: { userId: u.id, token, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
  });

  const mail = await sendEmail({
    to: user.email,
    subject: "Verify your ShyftForce email",
    html: Email.verify({ name: user.name, token }),
  });
  if (!mail.ok) {
    console.error("[verify-email/resend] send failed:", mail.error);
    return NextResponse.json({ error: "We couldn't send the email right now. Please try again shortly or contact support@shyftforce.com." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent: true });
}
