// PATCH a single application: move through pipeline (new → screen → interview
// → offer → hired/rejected) or update notes. Hiring is the special case —
// when status flips to "hired" we also mint an Invitation so the candidate
// gets a sign-up email and joins as a Member on first login.

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { Email, sendEmail } from "@/lib/email";

const PatchSchema = z.object({
  status:           z.enum(["new", "screen", "interview", "offer", "hired", "rejected"]).optional(),
  notes:            z.string().max(4000).nullable().optional(),
  rejectionReason:  z.string().max(500).nullable().optional(),
  // Only used when status === "hired":
  hireRole:         z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
  hireLocationId:   z.string().nullable().optional(),
  hirePosition:     z.string().nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const app = await prisma.jobApplication.findFirst({
    where: { id, jobPosting: { organizationId: u.organizationId } },
    include: { jobPosting: { select: { id: true, title: true, position: true, locationId: true } } },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  const now = new Date();

  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.rejectionReason !== undefined) data.rejectionReason = parsed.data.rejectionReason;

  if (parsed.data.status && parsed.data.status !== app.status) {
    data.status = parsed.data.status;
    data.reviewerId = u.memberId ?? app.reviewerId ?? null;
    if (!app.reviewedAt) data.reviewedAt = now;
    if (parsed.data.status === "rejected") data.rejectedAt = now;
    if (parsed.data.status === "hired")    data.hiredAt = now;
  }

  // Hire side-effect: mint invitation + email candidate.
  let invitationId: string | null = app.invitationId;
  if (parsed.data.status === "hired" && app.status !== "hired" && !app.invitationId) {
    const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });
    const inviter = await prisma.user.findUnique({ where: { id: u.id } });
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const token = randomBytes(32).toString("hex");
    const inv = await prisma.invitation.create({
      data: {
        organizationId: u.organizationId,
        email:          app.email.toLowerCase().trim(),
        role:           parsed.data.hireRole ?? "EMPLOYEE",
        position:       parsed.data.hirePosition ?? app.jobPosting.position ?? null,
        locationId:     parsed.data.hireLocationId ?? app.jobPosting.locationId ?? null,
        token,
        invitedById:    u.id,
        expiresAt:      new Date(Date.now() + 14 * 24 * 3600 * 1000),
      },
    });
    invitationId = inv.id;
    data.invitationId = inv.id;

    await sendEmail({
      to: app.email,
      subject: `You're hired at ${org.name} — finish setting up your account`,
      html: Email.invite({
        orgName:     org.name,
        inviterName: inviter?.name ?? "The hiring team",
        token:       inv.token,
      }),
    });
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, noop: true });

  await prisma.jobApplication.update({ where: { id }, data });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "JobApplication", entityId: id,
    metadata: {
      candidate: app.name,
      posting:   app.jobPosting.title,
      fields:    Object.keys(data),
      ...(invitationId && invitationId !== app.invitationId ? { invitationId } : {}),
    },
  });

  return NextResponse.json({ ok: true, invitationId });
}
