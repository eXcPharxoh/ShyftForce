import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRealSessionUser } from "@/lib/session";
import { isPlatformAdminEmail } from "@/lib/platform/admin";

// GET /api/platform/stats — global counts (platform admin only)
export async function GET() {
  const real = await getRealSessionUser();
  if (!real || !isPlatformAdminEmail(real.email)) {
    return NextResponse.json({ error: "platform admin only" }, { status: 403 });
  }

  const [
    orgs, users, members, shifts, openShifts,
    activeSubscriptions, trialOrgs, pastDueOrgs,
    incidentsOpen, ewaPending, networkOpen,
    newOrgsThisWeek, errorAudits24h,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.member.count({ where: { status: "active" } }),
    prisma.shift.count(),
    prisma.shift.count({ where: { isOpen: true, startsAt: { gt: new Date() } } }),
    prisma.organization.count({ where: { subscriptionStatus: "active" } }),
    prisma.organization.count({ where: { plan: "trial" } }),
    prisma.organization.count({ where: { subscriptionStatus: "past_due" } }),
    prisma.incidentReport.count({ where: { status: { in: ["open", "investigating"] } } }).catch(() => 0),
    prisma.ewaWithdrawal.count({ where: { status: { in: ["pending", "processing"] } } }).catch(() => 0),
    prisma.networkShiftOffer.count({ where: { status: "open" } }).catch(() => 0),
    prisma.organization.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86400_000) } } }),
  ]);

  return NextResponse.json({
    counts: { orgs, users, members, shifts, openShifts, newOrgsThisWeek },
    billing: { activeSubscriptions, trialOrgs, pastDueOrgs },
    operational: { incidentsOpen, ewaPending, networkOpen, auditEvents24h: errorAudits24h },
  });
}
