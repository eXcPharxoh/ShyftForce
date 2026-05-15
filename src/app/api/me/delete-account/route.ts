// Right-to-be-forgotten. Requires explicit confirmation in the body. We
// scrub PII rather than hard-deleting because payroll + compliance regs
// require retaining wage/timesheet records for 3-7 years (varies by region).
//
// What we do:
//   - Anonymize the User record (name → "Deleted user", email → random@deleted)
//   - Clear avatar, phone, emergency contacts, notes
//   - Mark the member status as "deactivated_gdpr"
//   - Drop OAuth identities + push subscriptions + recovery codes
//   - Audit the deletion at the org level
//
// To do a TRUE hard delete (for never-signed-in invitees / demo data) the
// platform admin uses /platform/users/[id] → set_status: inactive then via
// SQL. We don't expose that to tenants.

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const Schema = z.object({
  confirm: z.literal("DELETE MY ACCOUNT"),
  reason:  z.string().max(500).optional().nullable(),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({
      error: "Type 'DELETE MY ACCOUNT' exactly (with caps) into the confirm field to proceed.",
    }, { status: 400 });
  }

  // Block sole-admin deletion — would orphan the org.
  if (u.role === "ADMIN") {
    const otherAdmins = await prisma.member.count({
      where: { organizationId: u.organizationId, role: "ADMIN", status: "active", id: { not: u.memberId } },
    });
    if (otherAdmins === 0) {
      return NextResponse.json({
        error: "You're the only admin. Promote someone else to admin first, then come back to delete your account.",
      }, { status: 400 });
    }
  }

  const sentinelEmail = `deleted-${randomBytes(6).toString("hex")}@deleted.shyftforce.com`;
  const sentinelName  = "Deleted user";

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: u.id },
      data: {
        email:               sentinelEmail,
        name:                sentinelName,
        avatar:              null,
        password:            randomBytes(40).toString("hex"), // unguessable
        emailVerified:       null,
        totpEnabled:         false,
        totpSecret:          null,
        recoveryCodes:       null,
        failedLoginAttempts: 0,
        lockedUntil:         null,
      },
    });
    await tx.member.update({
      where: { id: u.memberId },
      data: {
        status:                 "deactivated_gdpr",
        phone:                  null,
        emergencyContactName:   null,
        emergencyContactPhone:  null,
        notes:                  null,
        smsOptIn:               false,
        kioskPinHash:           null,
        calendarToken:          null,
      },
    });
    await tx.oAuthIdentity.deleteMany({ where: { userId: u.id } });
    await tx.pushSubscription.deleteMany({ where: { userId: u.id } });
    await tx.passwordReset.deleteMany({ where: { userId: u.id } });
    await tx.emailVerification.deleteMany({ where: { userId: u.id } });
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "member.deactivate", entityType: "User", entityId: u.id,
    metadata: { reason: parsed.data.reason ?? null, kind: "gdpr_delete" },
  });

  return NextResponse.json({
    ok: true,
    note: "Account anonymized. Wage and timesheet records are retained per labor-law requirements; everything personally identifiable has been removed.",
  });
}
