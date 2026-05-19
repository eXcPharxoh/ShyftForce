// Permit status helpers used by the scheduler block + dashboard widget +
// reminder cron.

import { prisma } from "@/lib/prisma";

export type PermitStatus = "ok" | "expiring_soon" | "expiring_urgent" | "expired";

export type PermitWithStatus = {
  id:             string;
  category:       string;
  customLabel:    string | null;
  regulator:      string | null;
  permitNumber:   string | null;
  expiresOn:      Date;
  feeAmountCents: number | null;
  renewalUrl:     string | null;
  blocksScheduling: boolean;
  memberId:       string | null;
  memberName:     string | null;
  daysUntilExpiry:number;
  status:         PermitStatus;
};

export function statusFor(expiresOn: Date, now = new Date()): { days: number; status: PermitStatus } {
  const ms = +expiresOn - +now;
  const days = Math.ceil(ms / 86400_000);
  let status: PermitStatus = "ok";
  if (days < 0) status = "expired";
  else if (days <= 7) status = "expiring_urgent";
  else if (days <= 30) status = "expiring_soon";
  return { days, status };
}

/** All permits for an org, joined with member info + computed status. */
export async function listPermits(organizationId: string): Promise<PermitWithStatus[]> {
  const rows = await prisma.permit.findMany({
    where: { organizationId },
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { expiresOn: "asc" },
  });
  return rows.map(p => {
    const { days, status } = statusFor(p.expiresOn);
    return {
      id: p.id,
      category: p.category,
      customLabel: p.customLabel,
      regulator: p.regulator,
      permitNumber: p.permitNumber,
      expiresOn: p.expiresOn,
      feeAmountCents: p.feeAmountCents,
      renewalUrl: p.renewalUrl,
      blocksScheduling: p.blocksScheduling,
      memberId: p.memberId,
      memberName: p.member?.user.name ?? null,
      daysUntilExpiry: days,
      status,
    };
  });
}

/** Member IDs whose blocking permits are currently expired. The scheduler
 *  refuses to assign these members to new shifts. */
export async function blockedMemberIds(organizationId: string): Promise<Set<string>> {
  const now = new Date();
  const expired = await prisma.permit.findMany({
    where: {
      organizationId,
      memberId: { not: null },
      blocksScheduling: true,
      expiresOn: { lt: now },
    },
    select: { memberId: true },
  });
  return new Set(expired.map(p => p.memberId!).filter(Boolean));
}

/** Quick check for a single member — used by shift create/update routes. */
export async function memberHasExpiredBlockingPermit(memberId: string): Promise<boolean> {
  const row = await prisma.permit.findFirst({
    where: {
      memberId, blocksScheduling: true, expiresOn: { lt: new Date() },
    },
    select: { id: true },
  });
  return !!row;
}
