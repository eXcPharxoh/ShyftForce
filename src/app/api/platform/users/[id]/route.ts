// Platform admin: targeted user actions — reset password, unlock account,
// mark verified, change role, deactivate. Single PATCH endpoint with an
// "action" discriminator so the admin UI stays tidy.
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getRealSessionUser } from "@/lib/session";
import { isPlatformAdminEmail } from "@/lib/platform/admin";
import { Email, sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send_reset_password") }),
  z.object({ action: z.literal("unlock") }),
  z.object({ action: z.literal("verify_email") }),
  z.object({ action: z.literal("change_role"),    role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]) }),
  z.object({ action: z.literal("set_status"),     status: z.enum(["active", "inactive"]) }),
  z.object({ action: z.literal("send_email_verify") }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const real = await getRealSessionUser();
  if (!real || !isPlatformAdminEmail(real.email)) {
    return NextResponse.json({ error: "platform admin only" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = ActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id }, include: { member: true } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const orgId = user.member?.organizationId;

  try {
    switch (parsed.data.action) {
      case "send_reset_password": {
        const token = randomBytes(32).toString("hex");
        await prisma.passwordReset.create({
          data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
        });
        const res = await sendEmail({
          to: user.email,
          subject: "Reset your shyftforce password",
          html: Email.resetPassword({ name: user.name, token }),
        });
        if (orgId) await audit({ organizationId: orgId, actorId: real.id, action: "user.password_reset", entityType: "User", entityId: user.id, metadata: { byPlatformAdmin: real.email, provider: res.provider } });
        return NextResponse.json({ ok: true, sent: res.ok, provider: res.provider });
      }
      case "unlock": {
        await prisma.user.update({
          where: { id }, data: { lockedUntil: null, failedLoginAttempts: 0 },
        });
        if (orgId) await audit({ organizationId: orgId, actorId: real.id, action: "user.login", entityType: "User", entityId: user.id, metadata: { byPlatformAdmin: real.email, action: "unlock" } });
        return NextResponse.json({ ok: true });
      }
      case "verify_email": {
        await prisma.user.update({ where: { id }, data: { emailVerified: new Date() } });
        if (orgId) await audit({ organizationId: orgId, actorId: real.id, action: "user.verify_email", entityType: "User", entityId: user.id, metadata: { byPlatformAdmin: real.email, manual: true } });
        return NextResponse.json({ ok: true });
      }
      case "send_email_verify": {
        const token = randomBytes(32).toString("hex");
        await prisma.emailVerification.create({
          data: { userId: user.id, token, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
        });
        const res = await sendEmail({
          to: user.email,
          subject: "Verify your shyftforce email",
          html: Email.verify({ name: user.name, token }),
        });
        return NextResponse.json({ ok: true, sent: res.ok, provider: res.provider });
      }
      case "change_role": {
        if (!user.member) return NextResponse.json({ error: "user has no member record" }, { status: 400 });
        await prisma.member.update({ where: { id: user.member.id }, data: { role: parsed.data.role } });
        if (orgId) await audit({ organizationId: orgId, actorId: real.id, action: "member.role_change", entityType: "Member", entityId: user.member.id, metadata: { byPlatformAdmin: real.email, from: user.member.role, to: parsed.data.role } });
        return NextResponse.json({ ok: true, role: parsed.data.role });
      }
      case "set_status": {
        if (!user.member) return NextResponse.json({ error: "user has no member record" }, { status: 400 });
        await prisma.member.update({ where: { id: user.member.id }, data: { status: parsed.data.status } });
        if (orgId) await audit({ organizationId: orgId, actorId: real.id, action: parsed.data.status === "inactive" ? "member.deactivate" : "user.login", entityType: "Member", entityId: user.member.id, metadata: { byPlatformAdmin: real.email, to: parsed.data.status } });
        return NextResponse.json({ ok: true, status: parsed.data.status });
      }
    }
  } catch (e: any) {
    console.error("[platform/users/:id] action failed", e);
    return NextResponse.json({ error: "Action failed." }, { status: 500 });
  }
}
