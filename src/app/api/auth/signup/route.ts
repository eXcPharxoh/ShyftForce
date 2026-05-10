import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { Email, sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

const Schema = z.object({
  name:    z.string().min(2).max(60),
  email:   z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(120),
  orgName: z.string().min(2).max(80),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { name, email, password, orgName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) + "-" + randomBytes(3).toString("hex");
  const passwordHash = await bcrypt.hash(password, 10);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 3600 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: orgName, slug,
        plan: "trial", trialEndsAt,
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
  });

  // Send verification email
  const token = randomBytes(32).toString("hex");
  await prisma.emailVerification.create({
    data: { userId: result.user.id, token, expiresAt: new Date(Date.now() + 24*3600*1000) },
  });
  await sendEmail({
    to: result.user.email,
    subject: "Verify your shyftforce email",
    html: Email.verify({ name: result.user.name, token }),
  });

  await audit({
    organizationId: result.org.id, actorId: result.user.id,
    action: "org.create", entityType: "Organization", entityId: result.org.id,
    metadata: { orgName, plan: "trial", trialEndsAt },
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
  });
}
