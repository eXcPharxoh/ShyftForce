import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { Email, sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { ensureDefaultPolicies } from "@/lib/pto/service";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Schema = z.object({
  name:    z.string().min(2).max(60),
  email:   z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(120),
  orgName: z.string().min(2).max(80),
});

export async function POST(req: Request) {
  // Cap signup attempts per IP — stops automated org-spam without affecting
  // legitimate users (each one only signs up once).
  const ip = clientIp(req);
  const limit = rateLimit({ key: `signup:${ip}`, max: 5, windowMs: 10 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { name, email, password, orgName } = parsed.data;

  try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) + "-" + randomBytes(3).toString("hex");
  const passwordHash = await bcrypt.hash(password, 10);

  // Open-beta trial: 7 days of full Business-tier access, no credit card.
  // Caps (seats / locations) are bypassed while `trialEndsAt > now`. When
  // Stripe + paywall ship, the org's status drops to "free" automatically
  // unless they've subscribed — see lib/stripe.ts effectivePlanKey().
  const TRIAL_DAYS = 7;
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: orgName, slug,
        plan: "business",
        trialEndsAt,
        subscriptionStatus: "trialing",
      },
    });
    const user = await tx.user.create({
      data: {
        email, name, password: passwordHash,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316`,
        member: {
          create: {
            organizationId: org.id, role: "ADMIN",
            position: "Owner", hireDate: new Date(),
          },
        },
      },
      include: { member: true },
    });
    return { org, user };
  }, {
    // Neon serverless can take seconds to wake a cold branch. Prisma's default
    // interactive-transaction budget (maxWait 2s / timeout 5s) is easily blown
    // on the first signup after idle, which threw and produced a bodyless 500.
    maxWait: 15_000,
    timeout: 30_000,
  });

  // Seed default PTO policies for the new org. Non-fatal: the account already
  // exists at this point, so a failure here must NOT 500 the request and strand
  // the user with an account they can't get back into.
  await ensureDefaultPolicies(result.org.id).catch((e) => {
    console.error("[signup] ensureDefaultPolicies failed (non-fatal):", e);
  });

  // Send verification email. We do NOT swallow the result: if outbound mail
  // is unconfigured in production, the user account would otherwise be
  // stranded — created in the DB but unverifiable — and they'd assume the
  // app is broken. Surface the failure to the client so the signup form
  // can render a real error instead of bouncing them to /verify-email
  // where the email never arrives.
  // The account now EXISTS. Everything below is best-effort: a failure here
  // must never turn a created account into an error the user can't recover
  // from (they'd retry and just get "email already exists").
  const token = randomBytes(32).toString("hex");
  let emailSent = false;
  try {
    await prisma.emailVerification.create({
      data: { userId: result.user.id, token, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
    });
    const mail = await sendEmail({
      to: result.user.email,
      subject: "Verify your ShyftForce email",
      html: Email.verify({ name: result.user.name, token }),
    });
    emailSent = mail.ok;
    if (!mail.ok) console.error("[signup] verification email failed to send:", mail.error);
  } catch (e) {
    console.error("[signup] verification-email step failed (non-fatal):", e);
  }

  await audit({
    organizationId: result.org.id, actorId: result.user.id,
    action: "org.create", entityType: "Organization", entityId: result.org.id,
    metadata: { orgName, plan: "business", trialEndsAt, trialDays: TRIAL_DAYS },
  });
  await audit({
    organizationId: result.org.id, actorId: result.user.id,
    action: "user.signup", entityType: "User", entityId: result.user.id,
  });

  return NextResponse.json({
    ok: true,
    organization: { id: result.org.id, name: result.org.name, slug: result.org.slug },
    user: { id: result.user.id, email: result.user.email, name: result.user.name },
    requiresVerification: true,
    // Signup no longer HARD-FAILS when outbound mail is unconfigured (which is
    // the current prod state until RESEND_API_KEY is set). The workspace is
    // created and the user is signed in; the verify-email banner nudges them.
    emailSent,
  });

  } catch (e: any) {
    // Any unhandled throw used to escape the handler, and Next returns a 500
    // with an EMPTY body — the client's res.json() then died with
    // "Unexpected end of JSON input" instead of showing a real message.
    // Always log the real cause and always answer with JSON.
    console.error("[signup] failed:", e);
    const code = e?.code as string | undefined;

    if (code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    if (code === "P1001" || code === "P1002" || code === "P1008" || code === "P1017" || code === "P2024") {
      return NextResponse.json(
        { error: "We couldn't reach the database just now. Please try again in a moment.", code },
        { status: 503 },
      );
    }
    if (code === "P2021" || code === "P2022") {
      // Schema drift: the deployed app expects a table/column prod doesn't have.
      return NextResponse.json(
        { error: "Signup is temporarily unavailable (database is being updated). Please try again shortly or contact support@shyftforce.com.", code },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Something went wrong creating your workspace. Please try again — if it keeps happening, contact support@shyftforce.com.", code: code ?? null },
      { status: 500 },
    );
  }
}
