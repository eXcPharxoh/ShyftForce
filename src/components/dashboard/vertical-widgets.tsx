import { prisma } from "@/lib/prisma";
import { liveLabor } from "@/lib/pos/labor";
import { addDays, fmtMoney, startOfWeek } from "@/lib/utils";
import { verticalFor } from "@/lib/verticals/config";
import Link from "next/link";
import { Activity, AlertOctagon, CalendarClock, DollarSign, FileWarning, Globe, QrCode, ShieldAlert, TrendingUp, Wallet, Building2, Receipt } from "lucide-react";

/** Server component: renders the top-of-dashboard vertical-specific widget row.
 *  Picks 4 widgets from the vertical config and queries only the data they need. */
export async function VerticalWidgets({ organizationId, memberId, industry }: { organizationId: string; memberId: string; industry: string | null }) {
  const v = verticalFor(industry);
  const tiles = await Promise.all(v.dashboardWidgets.map((key) => buildTile(key, organizationId, memberId)));
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.filter(Boolean).map((t, i) => (
        <Link key={i} href={t!.href} className="card card-hover p-4 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t!.toneCls}`}>{t!.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 dark:text-ink-400">{t!.label}</div>
            <div className="text-lg font-bold tracking-tight-2 truncate">{t!.value}</div>
            {t!.sub && <div className="text-[10px] text-ink-500 dark:text-ink-400 truncate">{t!.sub}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
}

type Tile = { label: string; value: string; sub?: string; href: string; icon: React.ReactNode; toneCls: string };

async function buildTile(key: string, organizationId: string, memberId: string): Promise<Tile | null> {
  const now = new Date();
  switch (key) {
    case "liveLabor": {
      const snaps = await liveLabor({ organizationId, window: "today" });
      const totalLabor = snaps.reduce((a, s) => a + s.laborCostCents, 0);
      const totalRev = snaps.reduce((a, s) => a + s.grossSalesCents, 0);
      const pct = totalRev > 0 ? (totalLabor / totalRev) * 100 : null;
      const tone = pct == null ? "ink" : pct > 35 ? "rose" : pct > 28 ? "amber" : "emerald";
      return {
        label: "Labor % today",
        value: pct == null ? "—" : `${pct.toFixed(1)}%`,
        sub: `${fmtMoney(totalLabor / 100)} labor / ${fmtMoney(totalRev / 100)} revenue`,
        href: "/reports/labor-live",
        icon: <Activity className="w-5 h-5" />,
        toneCls: toneClass(tone),
      };
    }
    case "tipsToday": {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const pools = await prisma.tipPool.findMany({
        where: { organizationId, date: { gte: start, lt: new Date(start.getTime() + 86400_000) } },
        include: { distributions: true },
      }).catch(() => [] as any[]);
      const totalCents = pools.reduce((a: number, p: any) => a + (p.totalCents ?? 0), 0);
      const distCount = pools.reduce((a: number, p: any) => a + p.distributions.length, 0);
      return {
        label: "Tips pooled today",
        value: fmtMoney(totalCents / 100),
        sub: `${pools.length} pool${pools.length === 1 ? "" : "s"} · ${distCount} distributions`,
        href: "/tips",
        icon: <Receipt className="w-5 h-5" />,
        toneCls: toneClass("emerald"),
      };
    }
    case "incidentsOpen": {
      const items = await prisma.incidentReport.findMany({
        where: { organizationId, status: { in: ["open", "investigating"] } },
        orderBy: { occurredAt: "desc" },
        take: 1,
      }).catch(() => [] as any[]);
      const count = await prisma.incidentReport.count({
        where: { organizationId, status: { in: ["open", "investigating"] } },
      }).catch(() => 0);
      const critical = await prisma.incidentReport.count({
        where: { organizationId, status: { in: ["open", "investigating"] }, severity: { in: ["high", "critical"] } },
      }).catch(() => 0);
      return {
        label: "Open incidents",
        value: String(count),
        sub: critical > 0 ? `${critical} high/critical needs review` : items[0] ? items[0].title.slice(0, 40) : "no open incidents",
        href: "/incidents",
        icon: <FileWarning className="w-5 h-5" />,
        toneCls: toneClass(critical > 0 ? "rose" : count > 0 ? "amber" : "emerald"),
      };
    }
    case "checkpointsToday": {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const [scans, posts] = await Promise.all([
        prisma.checkpointScan.count({ where: { at: { gte: start }, post: { organizationId } } }).catch(() => 0),
        prisma.checkpointPost.count({ where: { organizationId, active: true } }).catch(() => 0),
      ]);
      return {
        label: "Checkpoint scans today",
        value: String(scans),
        sub: `${posts} active post${posts === 1 ? "" : "s"}`,
        href: "/settings/checkpoints",
        icon: <QrCode className="w-5 h-5" />,
        toneCls: toneClass(scans > 0 ? "brand" : "ink"),
      };
    }
    case "clientHours": {
      const ws = startOfWeek(now);
      const we = addDays(ws, 7);
      const entries = await prisma.timesheetEntry.findMany({
        where: { date: { gte: ws, lt: we }, member: { organizationId }, approved: true },
        select: { hours: true },
      });
      const totalH = entries.reduce((a, e) => a + e.hours, 0);
      const clients = await prisma.clientAccount.count({ where: { organizationId, active: true } }).catch(() => 0);
      return {
        label: "Hours billed this week",
        value: `${totalH.toFixed(0)}h`,
        sub: `${clients} active client${clients === 1 ? "" : "s"}`,
        href: "/reports/client-billing",
        icon: <Building2 className="w-5 h-5" />,
        toneCls: toneClass("brand"),
      };
    }
    case "coverageOpen": {
      const horizon = new Date(now.getTime() + 48 * 3600_000);
      const open = await prisma.shift.count({
        where: { isOpen: true, memberId: null, startsAt: { gte: now, lt: horizon }, location: { organizationId } },
      });
      const pending = await prisma.openShiftOffer.count({
        where: { status: "pending", shift: { location: { organizationId } } },
      });
      return {
        label: "Coverage needed (48h)",
        value: String(open),
        sub: pending > 0 ? `${pending} offers in flight` : "autopilot will fire on call-out",
        href: "/schedule/coverage",
        icon: <ShieldAlert className="w-5 h-5" />,
        toneCls: toneClass(open > 5 ? "rose" : open > 0 ? "amber" : "emerald"),
      };
    }
    case "demandPeak": {
      const ws = startOfWeek(now);
      const we = addDays(ws, 7);
      const slots = await prisma.demandForecast.findMany({
        where: { organizationId, slotStart: { gte: ws, lt: we } },
        orderBy: { predictedHeadcount: "desc" },
        take: 1,
      }).catch(() => [] as any[]);
      const peak = slots[0];
      return {
        label: "Peak demand this week",
        value: peak ? `${peak.predictedHeadcount} staff` : "—",
        sub: peak ? peak.slotStart.toLocaleString("en-US", { weekday: "short", hour: "numeric" }) : "regenerate forecast to populate",
        href: "/schedule/forecast",
        icon: <TrendingUp className="w-5 h-5" />,
        toneCls: toneClass("brand"),
      };
    }
    case "ewaPending": {
      const count = await prisma.ewaWithdrawal.count({
        where: { organizationId, status: { in: ["pending", "processing"] } },
      }).catch(() => 0);
      const cents = await prisma.ewaWithdrawal.aggregate({
        where: { organizationId, status: { in: ["pending", "processing"] } },
        _sum: { amountCents: true },
      }).catch(() => ({ _sum: { amountCents: 0 } } as any));
      const total = cents._sum?.amountCents ?? 0;
      return {
        label: "EWA pending",
        value: fmtMoney(total / 100),
        sub: `${count} withdrawal${count === 1 ? "" : "s"} awaiting payroll`,
        href: "/settings/ewa",
        icon: <Wallet className="w-5 h-5" />,
        toneCls: toneClass("amber"),
      };
    }
    case "networkOffers": {
      const profile = await prisma.workerProfile.findUnique({ where: { userId: memberId.length === 36 ? memberId : "no" } }).catch(() => null);
      const open = profile ? await prisma.networkShiftOffer.count({
        where: { status: "open", postingOrgId: { not: organizationId }, OR: [{ invitedWorkerId: profile.id }, ...(profile.discoverable ? [{ invitedWorkerId: null }] : [])] },
      }) : 0;
      const posted = await prisma.networkShiftOffer.count({
        where: { postingOrgId: organizationId, status: "open" },
      });
      return {
        label: "Network shifts",
        value: String(open + posted),
        sub: `${posted} posted · ${open} available to claim`,
        href: posted >= open ? "/network" : "/network/available",
        icon: <Globe className="w-5 h-5" />,
        toneCls: toneClass("brand"),
      };
    }
    case "upcomingShifts": {
      const member = await prisma.member.findFirst({ where: { id: memberId } }).catch(() => null);
      if (!member) return null;
      const next = await prisma.shift.findFirst({
        where: { memberId: member.id, startsAt: { gt: now } },
        orderBy: { startsAt: "asc" },
        include: { location: true },
      });
      return {
        label: "Your next shift",
        value: next ? next.startsAt.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "—",
        sub: next ? `${next.position ?? "Shift"} · ${next.location.name}` : "no upcoming shifts",
        href: "/schedule",
        icon: <CalendarClock className="w-5 h-5" />,
        toneCls: toneClass("brand"),
      };
    }
    default:
      return null;
  }
}

function toneClass(tone: "ink" | "brand" | "amber" | "emerald" | "rose"): string {
  return {
    ink:     "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300",
    brand:   "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    amber:   "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    rose:    "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  }[tone];
}
