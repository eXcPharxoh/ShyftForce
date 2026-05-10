import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Email, sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

const Schema = z.object({
  invitations: z.array(z.object({
    email: z.string().email().toLowerCase().trim(),
    role:  z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
    position: z.string().optional(),
    locationId: z.string().optional(),
  })).min(1).max(50),
});

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Lookup inviter name
  const inviter = await prisma.user.findUnique({ where: { id: u.id } });
  const inviterName = inviter?.name ?? "A teammate";
  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const created: any[] = [];
  for (const inv of parsed.data.invitations) {
    const token = randomBytes(32).toString("hex");
    const rec = await prisma.invitation.upsert({
      where: { id: `${u.organizationId}|${inv.email}` }, // bogus id; we'll compose below
      update: {}, // unused
      create: {
        organizationId: u.organizationId,
        email: inv.email, role: inv.role,
        position: inv.position, locationId: inv.locationId,
        token, invitedById: u.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    }).catch(async () => {
      // Upsert via composite isn't possible without a unique; create directly and ignore duplicates
      return await prisma.invitation.create({
        data: {
          organizationId: u.organizationId,
          email: inv.email, role: inv.role,
          position: inv.position, locationId: inv.locationId,
          token, invitedById: u.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        },
      });
    });
    await sendEmail({
      to: inv.email,
      subject: `${inviterName} invited you to ${org.name} on shyftforce`,
      html: Email.invite({ orgName: org.name, inviterName, token: rec.token }),
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "member.invite", entityType: "Invitation", entityId: rec.id,
      metadata: { email: inv.email, role: inv.role },
    });
    created.push({ id: rec.id, email: rec.email, role: rec.role, expiresAt: rec.expiresAt });
  }
  return NextResponse.json({ ok: true, invited: created.length, invitations: created });
}

// GET: list pending invites for this org
export async function GET() {
  const u = await requireManagerOrAdmin();
  const invites = await prisma.invitation.findMany({
    where: { organizationId: u.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invitations: invites });
}
