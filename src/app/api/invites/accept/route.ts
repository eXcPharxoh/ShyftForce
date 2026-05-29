import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { PLANS, effectivePlanKey } from "@/lib/stripe";
import { syncSeatsForOrg } from "@/lib/billing/sync-seats";

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
  if (user && user.member && user.member.organizationId !== inv.organizationId) {
    return NextResponse.json({ error: "User is already a member of another workspace; multi-org accounts coming soon." }, { status: 409 });
  }
  if (!user && (!parsed.data.name || !parsed.data.password)) {
    return NextResponse.json({ error: "name and password required for new account", needsAccount: true, email: inv.email }, { status: 400 });
  }

  // Atomic accept: user-create (if needed) + seat-cap check + member-create +
  // invitation-update all in one transaction so two concurrent accepts can't
  // both pass the cap and create duplicate members. Pre-hash the password
  // outside the transaction (CPU work, not DB work) so the transaction stays
  // short and doesn't hold row locks any longer than necessary.
  const passwordHash = !user && parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : null;

  try {
    user = await prisma.$transaction(async (tx) => {
      let u = user;
      if (!u) {
        u = await tx.user.create({
          data: {
            email: inv.email, name: parsed.data.name!, password: passwordHash!,
            emailVerified: new Date(), // accepting invite implies they own the email
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(parsed.data.name!)}`,
          },
          include: { member: true },
        });
      }
      if (!u.member) {
        // Enforce the Free-plan hard seat cap inside the transaction so the
        // count-then-create race condition can't sneak past it.
        const orgPlan = effectivePlanKey(inv.organization);
        const def = PLANS[orgPlan];
        if (def.maxMembersHard < 9999) {
          const activeMembers = await tx.member.count({
            where: { organizationId: inv.organizationId, status: "active" },
          });
          if (activeMembers >= def.maxMembersHard) {
            throw new Error(`PLAN_CAP_HIT::${def.label}::${def.maxMembersHard}`);
          }
        }
        await tx.member.create({
          data: {
            userId: u.id, organizationId: inv.organizationId,
            role: inv.role, position: inv.position ?? null, locationId: inv.locationId ?? null,
            hireDate: new Date(),
          },
        });
      }
      await tx.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
      return u;
    });
  } catch (e: any) {
    if (typeof e?.message === "string" && e.message.startsWith("PLAN_CAP_HIT::")) {
      const [, label, cap] = e.message.split("::");
      return NextResponse.json({
        error: `This workspace is on the ${label} plan, which caps active members at ${cap}. The owner needs to upgrade to add more.`,
        planCapHit: true,
      }, { status: 402 });
    }
    throw e;
  }
  await audit({
    organizationId: inv.organizationId, actorId: user.id,
    action: "member.invite_accept", entityType: "Invitation", entityId: inv.id,
    metadata: { email: inv.email, role: inv.role },
  });
  // Push the new seat count to Stripe so the per-seat overage line stays accurate.
  syncSeatsForOrg(inv.organizationId).catch(() => {});

  return NextResponse.json({ ok: true, email: user.email, organizationName: inv.organization.name });
}
