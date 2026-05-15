// Platform admin: create a new organization (with owner user) and onboard a
// new client end-to-end. Two modes:
//   - "invite": create org, set up an Invitation, email the owner to set their
//     own password. Use this when bringing on a real customer.
//   - "create": create org + user with a temporary password we generate. The
//     owner gets a password-reset email so they pick a real one. Use this for
//     demo accounts you want to be able to log in to immediately.
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getRealSessionUser } from "@/lib/session";
import { isPlatformAdminEmail } from "@/lib/platform/admin";
import { Email, sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { ensureDefaultPolicies } from "@/lib/pto/service";

const CreateSchema = z.object({
  name:     z.string().min(2).max(80),
  industry: z.enum(["restaurant", "retail", "healthcare", "field_service", "office", "fitness", "security", "other"]).optional(),
  plan:     z.enum(["free", "pro", "business", "enterprise"]).default("free"),
  trialDays:z.number().int().min(0).max(365).default(0),
  timezone: z.string().max(60).default("America/New_York"),
  isDemo:   z.boolean().default(false),
  mode:     z.enum(["invite", "create"]).default("invite"),
  owner: z.object({
    name:    z.string().min(2).max(60),
    email:   z.string().email().toLowerCase().trim(),
    password: z.string().min(8).max(120).optional(), // only used in "create" mode
  }),
}).strict();

function slugFor(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  return (base || "org") + "-" + randomBytes(3).toString("hex");
}

export async function POST(req: Request) {
  const real = await getRealSessionUser();
  if (!real || !isPlatformAdminEmail(real.email)) {
    return NextResponse.json({ error: "platform admin only" }, { status: 403 });
  }
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Reject if the owner email is already used.
  const existingUser = await prisma.user.findUnique({ where: { email: data.owner.email } });
  if (existingUser && data.mode === "create") {
    return NextResponse.json({ error: `A user with email ${data.owner.email} already exists. Use 'invite' mode or pick a different email.` }, { status: 409 });
  }

  const slug = slugFor(data.name);
  // Trial only applies to paid plans where admin is comping a customer onto Pro/Business.
  // Forever-free has no expiry; Enterprise is handled out-of-band.
  const trialEndsAt = data.trialDays > 0 && (data.plan === "pro" || data.plan === "business")
    ? new Date(Date.now() + data.trialDays * 24 * 3600 * 1000)
    : null;

  try {
    if (data.mode === "create") {
      // Eager owner creation — admin sets the password (or we generate one)
      const password = data.owner.password || randomBytes(12).toString("base64url");
      const passwordHash = await bcrypt.hash(password, 10);

      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { name: data.name, slug, plan: data.plan, trialEndsAt, industry: data.industry ?? null, timezone: data.timezone, isDemo: data.isDemo },
        });
        const user = await tx.user.create({
          data: {
            email: data.owner.email, name: data.owner.name, password: passwordHash,
            emailVerified: new Date(), // admin-created accounts are pre-verified
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.owner.name)}&backgroundColor=f97316`,
            member: {
              create: { organizationId: org.id, role: "ADMIN", position: "Owner", hireDate: new Date() },
            },
          },
          include: { member: true },
        });
        return { org, user, generatedPassword: !data.owner.password ? password : null };
      });

      await ensureDefaultPolicies(result.org.id);

      // Send welcome + password-reset (so the user can set their own)
      const resetToken = randomBytes(32).toString("hex");
      await prisma.passwordReset.create({
        data: { userId: result.user.id, token: resetToken, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
      });
      await sendEmail({
        to: result.user.email,
        subject: `Your shyftforce workspace is ready — ${data.name}`,
        html: Email.resetPassword({ name: result.user.name, token: resetToken }),
      });

      await audit({
        organizationId: result.org.id, actorId: real.id,
        action: "org.create", entityType: "Organization", entityId: result.org.id,
        metadata: { byPlatformAdmin: real.email, mode: "create", plan: data.plan, isDemo: data.isDemo },
      });

      return NextResponse.json({
        ok: true,
        organization: { id: result.org.id, name: result.org.name, slug: result.org.slug },
        owner: { id: result.user.id, email: result.user.email, name: result.user.name },
        // If we generated a password, surface it once — admin can copy/share it.
        generatedPassword: result.generatedPassword,
      });
    }

    // mode === "invite"
    const org = await prisma.organization.create({
      data: { name: data.name, slug, plan: data.plan, trialEndsAt, industry: data.industry ?? null, timezone: data.timezone, isDemo: data.isDemo },
    });
    await ensureDefaultPolicies(org.id);

    const token = randomBytes(32).toString("hex");
    const invitation = await prisma.invitation.create({
      data: {
        organizationId: org.id,
        email: data.owner.email, role: "ADMIN",
        position: "Owner",
        token, invitedById: real.id,
        expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000), // 14d for owner invite
      },
    });
    await sendEmail({
      to: data.owner.email,
      subject: `You're invited to ${data.name} on shyftforce`,
      html: Email.invite({ orgName: data.name, inviterName: real.email, token: invitation.token }),
    });

    await audit({
      organizationId: org.id, actorId: real.id,
      action: "org.create", entityType: "Organization", entityId: org.id,
      metadata: { byPlatformAdmin: real.email, mode: "invite", plan: data.plan, ownerEmail: data.owner.email },
    });

    return NextResponse.json({
      ok: true,
      organization: { id: org.id, name: org.name, slug: org.slug },
      invitation: { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt },
    });
  } catch (e: any) {
    console.error("[platform/orgs] create failed", e);
    return NextResponse.json({ error: "Failed to create organization." }, { status: 500 });
  }
}
