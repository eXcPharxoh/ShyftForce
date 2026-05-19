// Live labor% alert cron. Vercel cron hits this every hour during typical
// open hours. For each active LaborTarget, compute the rolling labor% over
// the last 4 hours (cost vs POS revenue) and SMS the manager if breached.
//
// Cost  = SUM(hours-on-clock × hourlyRate) for members at this location
// Revenue = SUM(POS net or gross sales) for this location in same window
// Percent = cost / revenue * 100

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MINUTES = 4 * 60;

async function handler(req: Request) {
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (process.env.CRON_SECRET) {
    if (auth !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60_000);

  const targets = await prisma.laborTarget.findMany({
    where: { active: true },
    include: { location: { select: { name: true } } },
  });

  let alerts = 0;
  let scanned = 0;

  for (const t of targets) {
    scanned++;
    // Cooldown — don't re-alert within N minutes
    if (t.lastAlertAt && (+now - +t.lastAlertAt) < t.cooldownMinutes * 60_000) continue;

    // Revenue for the window
    const rev = await prisma.posRevenueSnapshot.aggregate({
      where: { locationId: t.locationId, intervalStart: { gte: windowStart, lte: now } },
      _sum: { grossSalesCents: true, netSalesCents: true },
    });
    const revenueCents = rev._sum.netSalesCents ?? rev._sum.grossSalesCents ?? 0;
    if (revenueCents <= 0) continue; // no revenue data → can't compute, skip

    // Cost: hours-on-clock at this location × hourlyRate. We approximate by
    // looking at all clock_in events without a matching clock_out, plus any
    // closed shifts that overlapped the window.
    const onClock = await prisma.member.findMany({
      where: {
        locationId: t.locationId,
        status: "active",
        hourlyRate: { not: null },
      },
      select: {
        id: true, hourlyRate: true,
        attendanceLogs: {
          where: { at: { gte: windowStart, lte: now } },
          orderBy: { at: "asc" },
        },
      },
    });

    let costCents = 0;
    for (const m of onClock) {
      // Walk through their punches in the window, summing in/out pairs
      let inAt: Date | null = null;
      for (const ev of m.attendanceLogs) {
        if (ev.type === "clock_in" || ev.type === "break_end") {
          if (!inAt) inAt = ev.at;
        } else if (ev.type === "clock_out" || ev.type === "break_start") {
          if (inAt) {
            const hours = Math.max(0, (+ev.at - +inAt) / 3600_000);
            costCents += Math.round(hours * (m.hourlyRate ?? 0) * 100);
            inAt = null;
          }
        }
      }
      // Still on clock at window end?
      if (inAt) {
        const hours = Math.max(0, (+now - +inAt) / 3600_000);
        costCents += Math.round(hours * (m.hourlyRate ?? 0) * 100);
      }
    }

    if (costCents === 0) continue;
    const actualPercent = (costCents / revenueCents) * 100;
    if (actualPercent - t.targetPercent <= t.breachThreshold) continue;

    // BREACH — text the manager(s)
    const managers = t.alertManagerId
      ? await prisma.member.findMany({ where: { id: t.alertManagerId, status: "active" }, include: { user: { select: { id: true } } } })
      : await prisma.member.findMany({
          where: { organizationId: t.organizationId, locationId: t.locationId, status: "active", role: { in: ["ADMIN", "MANAGER"] } },
          include: { user: { select: { id: true } } },
        });

    const overBy = (actualPercent - t.targetPercent).toFixed(1);
    const body = `⚠ Labor% at ${t.location.name}: ${actualPercent.toFixed(1)}% (target ${t.targetPercent.toFixed(1)}%, over by ${overBy}pp). Consider sending someone home.`;

    await Promise.all(managers.map(async m => {
      sendPush(m.user.id, {
        title: `Labor% over target`,
        body:  `${t.location.name}: ${actualPercent.toFixed(1)}% (target ${t.targetPercent.toFixed(1)}%)`,
        url:   "/reports/labor-live",
        tag:   `labor-${t.id}`,
      }).catch(() => {});
      if (m.phone) {
        sendSms({
          organizationId: t.organizationId, memberId: m.id,
          toNumber: m.phone, body, category: "alert", bypassOptIn: false,
        }).catch(() => {});
      }
    }));

    await prisma.laborTarget.update({
      where: { id: t.id },
      data: { lastAlertAt: now, lastAlertActualPercent: actualPercent },
    });
    alerts++;
  }

  return NextResponse.json({ ok: true, scanned, alerts });
}

export const GET = handler;
export const POST = handler;
