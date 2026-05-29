import { prisma } from "@/lib/prisma";
import { liveLabor } from "@/lib/pos/labor";
import { addDays, fmtMoney, startOfWeek } from "@/lib/utils";
import { verticalFor } from "@/lib/verticals/config";
import Link from "next/link";
import { Activity, AlertOctagon, CalendarClock, DollarSign, FileWarning, Globe, QrCode, ShieldAlert, TrendingUp, Wallet, Building2, Receipt, Bed, HardHat, Package, Dumbbell, Trash, Image as ImageIcon, Phone, Truck } from "lucide-react";

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
      // WorkerProfile is keyed by userId, not memberId — look up the user.
      const member = await prisma.member.findUnique({ where: { id: memberId }, select: { userId: true } }).catch(() => null);
      const profile = member ? await prisma.workerProfile.findUnique({ where: { userId: member.userId } }).catch(() => null) : null;
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
    case "roomStatus": {
      const rooms = await prisma.hotelRoom.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true },
      }).catch(() => [] as any[]);
      const byStatus: Record<string, number> = { clean: 0, dirty: 0, cleaning: 0, out_of_order: 0 };
      for (const r of rooms) byStatus[r.status] = r._count._all;
      const total = byStatus.clean + byStatus.dirty + byStatus.cleaning + byStatus.out_of_order;
      const dirty = byStatus.dirty + byStatus.cleaning;
      return {
        label: "Rooms to turn",
        value: `${dirty}/${total}`,
        sub: `${byStatus.clean} clean · ${byStatus.out_of_order} OoO`,
        href: "/rooms",
        icon: <Bed className="w-5 h-5" />,
        toneCls: toneClass(dirty > total / 3 ? "amber" : "emerald"),
      };
    }
    case "lostFound": {
      const unclaimed = await prisma.lostFoundItem.count({
        where: { organizationId, status: "unclaimed" },
      }).catch(() => 0);
      return {
        label: "Unclaimed L&F",
        value: String(unclaimed),
        sub: unclaimed === 0 ? "all caught up" : "review for return / discard",
        href: "/lost-found",
        icon: <Package className="w-5 h-5" />,
        toneCls: toneClass(unclaimed > 0 ? "amber" : "emerald"),
      };
    }
    case "safetyAcks": {
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const briefings = await prisma.safetyBriefing.findMany({
        where: { organizationId, postedAt: { gte: today } },
        include: { acks: true },
      }).catch(() => [] as any[]);
      const memberCount = await prisma.member.count({ where: { organizationId, status: "active" } });
      const totalAcks = briefings.reduce((a: number, b: any) => a + b.acks.length, 0);
      const required = briefings.length * memberCount;
      const pct = required > 0 ? Math.round((totalAcks / required) * 100) : 100;
      return {
        label: "Safety acks today",
        value: `${pct}%`,
        sub: `${briefings.length} briefing${briefings.length === 1 ? "" : "s"} · ${totalAcks}/${required} acked`,
        href: "/safety",
        icon: <HardHat className="w-5 h-5" />,
        toneCls: toneClass(pct < 80 ? "rose" : pct < 100 ? "amber" : "emerald"),
      };
    }
    case "classesToday": {
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 86400_000);
      const occurrences = await prisma.classOccurrence.findMany({
        where: { fitnessClass: { organizationId }, startsAt: { gte: today, lt: tomorrow } },
      }).catch(() => [] as any[]);
      const done = occurrences.filter((o: any) => o.status === "done").length;
      const totalAtt = occurrences.reduce((a: number, o: any) => a + (o.attendees ?? 0), 0);
      return {
        label: "Classes today",
        value: `${done}/${occurrences.length}`,
        sub: `${totalAtt} attendees so far`,
        href: "/classes",
        icon: <Dumbbell className="w-5 h-5" />,
        toneCls: toneClass("brand"),
      };
    }
    case "shrinkWeek": {
      const ws = startOfWeek(now);
      const sum = await prisma.shrinkEvent.aggregate({
        where: { organizationId, occurredAt: { gte: ws } },
        _sum: { totalValueCents: true },
      }).catch(() => ({ _sum: { totalValueCents: 0 } } as any));
      const total = sum._sum?.totalValueCents ?? 0;
      return {
        label: "Shrink this week",
        value: fmtMoney(total / 100),
        sub: total > 50000 ? "above weekly target" : "within target",
        href: "/shrink",
        icon: <Trash className="w-5 h-5" />,
        toneCls: toneClass(total > 100000 ? "rose" : total > 50000 ? "amber" : "emerald"),
      };
    }
    case "vmTasksOpen": {
      const open = await prisma.vmTask.count({
        where: { organizationId, status: "open" },
      }).catch(() => 0);
      const overdue = await prisma.vmTask.count({
        where: { organizationId, status: "open", dueDate: { lt: now } },
      }).catch(() => 0);
      return {
        label: "VM tasks open",
        value: String(open),
        sub: overdue > 0 ? `${overdue} overdue` : "all on schedule",
        href: "/vm-tasks",
        icon: <ImageIcon className="w-5 h-5" />,
        toneCls: toneClass(overdue > 0 ? "rose" : open > 5 ? "amber" : "emerald"),
      };
    }
    case "onCallToday": {
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 86400_000);
      const onCall = await prisma.onCallShift.findMany({
        where: {
          organizationId,
          startsAt: { lt: tomorrow },
          endsAt: { gte: today },
        },
        include: { member: { include: { user: { select: { name: true } } } } },
      }).catch(() => [] as any[]);
      return {
        label: "On-call today",
        value: String(onCall.length),
        sub: onCall[0] ? onCall[0].member.user.name : "no coverage scheduled",
        href: "/on-call",
        icon: <Phone className="w-5 h-5" />,
        toneCls: toneClass(onCall.length === 0 ? "rose" : "brand"),
      };
    }
    case "vehiclesActive": {
      const active = await prisma.vehicle.count({ where: { organizationId, status: "active" } }).catch(() => 0);
      const maint = await prisma.vehicle.count({ where: { organizationId, status: "maintenance" } }).catch(() => 0);
      return {
        label: "Fleet status",
        value: String(active),
        sub: maint > 0 ? `${maint} in maintenance` : "all active",
        href: "/settings/vehicles",
        icon: <Truck className="w-5 h-5" />,
        toneCls: toneClass(maint > 0 ? "amber" : "emerald"),
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
