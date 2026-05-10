import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { audit } from "@/lib/audit";

const Schema = z.object({
  token: z.string().min(20),
  name:  z.string().min(2).max(60).optional(),  // required if new account
  password: z.string().min(8).max(120).optional(), // required if new account
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const inv = await prisma.invitation.findUnique({ where: { token: parsed.data.token }, include: { organization: true } });
  if (!inv) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (inv.acceptedAt) return NextResponse.json({ error: "Invitation already accepted" }, { status: 410 });
  if (inv.expiresAt < new Date()) return NextResponse.json({ error: "Invitation expired" }, { status: 410 });

  // Check if user already exists with this email
  let user = await prisma.user.findUnique({ where: { email: inv.email }, include: { member: true } });

  if (!user) {
    if (!parsed.data.name || !parsed.data.password) {
      return NextResponse.json({ error: "name and password required for new account", needsAccount: true, email: inv.email }, { status: 400 });
    }
    const hash = await bcrypt.hash(parsed.data.password, 10);
    user = await prisma.user.create({
      data: {
        email: inv.email, name: parsed.data.name, password: hash,
        emailVerified: new Date(), // accepting invite implies they own the email
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(parsed.data.name)}`,
      },
      include: { member: true },
    });
  }

  // Create or update member record for this org
  if (user.member && user.member.organizationId !== inv.organizationId) {
    return NextResponse.json({ error: "User is already a member of another workspace; multi-org accounts coming soon." }, { status: 409 });
  }
  if (!user.member) {
    await prisma.member.create({
      data: {
        userId: user.id, organizationId: inv.organizationId,
        role: inv.role, position: inv.position ?? null, locationId: inv.locationId ?? null,
        hireDate: new Date(),
      },
    });
  }

  await prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  await audit({
    organizationId: inv.organizationId, actorId: user.id,
    action: "member.invite_accept", entityType: "Invitation", entityId: inv.id,
    metadata: { email: inv.email, role: inv.role },
  });

  return NextResponse.json({ ok: true, email: user.email, organizationName: inv.organization.name });
}
