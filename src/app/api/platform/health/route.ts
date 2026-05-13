import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRealSessionUser } from "@/lib/session";
import { isPlatformAdminEmail } from "@/lib/platform/admin";

// GET /api/platform/health — system health snapshot for platform admins
export async function GET() {
  const real = await getRealSessionUser();
  if (!real || !isPlatformAdminEmail(real.email)) {
    return NextResponse.json({ error: "platform admin only" }, { status: 403 });
  }
  const now = new Date();

  // Cron health: last tick visible via the latest "compliance/forecast/coverage/pos" audit
  // Since cron uses Bearer auth (no actorId), proxy heuristic: last OpenShiftOffer status change
  // for coverage cron, last PosRevenueSnapshot for POS cron, last reputationUpdatedAt for network cron.
  const [
    latestOffer,
    latestSnapshot,
    latestRep,
    failedConnections,
    pastDueSubs,
    dbCheck,
    envCheck,
  ] = await Promise.all([
    prisma.openShiftOffer.findFirst({ orderBy: { sentAt: "desc" }, select: { sentAt: true } }),
    prisma.posRevenueSnapshot.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null),
    prisma.workerProfile.findFirst({
      where: { reputationUpdatedAt: { not: null } },
      orderBy: { reputationUpdatedAt: "desc" },
      select: { reputationUpdatedAt: true },
    }).catch(() => null),
    prisma.posConnection.count({ where: { status: "error" } }).catch(() => 0),
    prisma.organization.findMany({
      where: { subscriptionStatus: "past_due" },
      select: { id: true, name: true, plan: true },
      take: 10,
    }),
    // Cheap DB ping
    prisma.$queryRaw`SELECT 1 as ok`.then(() => true).catch(() => false),
    // Env required for prod
    Promise.resolve({
      NEXTAUTH_SECRET:        !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL:           !!process.env.NEXTAUTH_URL,
      DATABASE_URL:           !!process.env.DATABASE_URL,
      SHYFTFORCE_AI_KEY:      !!process.env.SHYFTFORCE_AI_KEY,
      STRIPE_SECRET_KEY:      !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET:  !!process.env.STRIPE_WEBHOOK_SECRET,
      RESEND_API_KEY:         !!process.env.RESEND_API_KEY,
      CRON_SECRET:            !!process.env.CRON_SECRET,
      PLATFORM_ADMIN_EMAILS:  !!process.env.PLATFORM_ADMIN_EMAILS,
    }),
  ]);

  const minutesSince = (d: Date | null | undefined) => d ? Math.floor((+now - +d) / 60_000) : null;

  return NextResponse.json({
    db: { ok: dbCheck },
    env: envCheck,
    cron: {
      coverageMinutesAgo: minutesSince(latestOffer?.sentAt ?? null),
      posSyncMinutesAgo:  minutesSince(latestSnapshot?.createdAt ?? null),
      reputationMinutesAgo: minutesSince(latestRep?.reputationUpdatedAt ?? null),
    },
    pos: { failedConnections },
    billing: { pastDue: pastDueSubs },
  });
}
