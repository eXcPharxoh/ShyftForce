import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { fmtMoney, relTime } from "@/lib/utils";
import { calculateMonthlyCost, normalizePlanKey } from "@/lib/stripe";
import { PlatformMap } from "@/components/platform/platform-map";
import { Building2, Users, Calendar, Wallet, AlertOctagon, TrendingUp, Activity, FileWarning, DollarSign, PowerOff } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlatformOverview() {
  const now = new Date();
  const [
    orgs, users, members, shifts, openShifts,
    activeSubs, trialOrgs, pastDueSubs,
    newOrgsThisWeek, latestOrgs, latestSignups,
    incidentsOpen, ewaPending, networkOpen,
    suspendedCount, paidOrgs,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.member.count({ where: { status: "active" } }),
    prisma.shift.count(),
    prisma.shift.count({ where: { isOpen: true, startsAt: { gt: now } } }),
    prisma.organization.count({ where: { subscriptionStatus: "active" } }),
    // On trial = trial window still open (signup stores plan "business", so the
    // old plan:"trial" filter always returned 0).
    prisma.organization.count({ where: { trialEndsAt: { gt: now } } }),
    prisma.organization.findMany({
      where: { subscriptionStatus: "past_due" },
      select: { id: true, name: true, plan: true },
      take: 5,
    }),
    prisma.organization.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * 86400_000) } } }),
    prisma.organization.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, industry: true, plan: true, createdAt: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, email: true, name: true, createdAt: true } }),
    prisma.incidentReport.count({ where: { status: { in: ["open", "investigating"] } } }).catch(() => 0),
    prisma.ewaWithdrawal.count({ where: { status: { in: ["pending", "processing"] } } }).catch(() => 0),
    prisma.networkShiftOffer.count({ where: { status: "open" } }).catch(() => 0),
    prisma.organization.count({ where: { suspendedAt: { lt: now } } }),
    // Paid orgs (active sub) → MRR (seat counts fetched separately below).
    prisma.organization.findMany({
      where: { subscriptionStatus: "active" },
      select: { id: true, plan: true },
    }),
  ]);

  // Active-seat counts for the paying orgs, then MRR = sum of base + overage.
  const seatCounts = paidOrgs.length
    ? await prisma.member.groupBy({
        by: ["organizationId"],
        where: { status: "active", organizationId: { in: paidOrgs.map((o) => o.id) } },
        _count: { _all: true },
      })
    : [];
  const seatByOrg = new Map(seatCounts.map((s) => [s.organizationId, s._count._all]));
  const mrrUSD = paidOrgs.reduce((sum, o) => {
    return sum + calculateMonthlyCost(normalizePlanKey(o.plan), seatByOrg.get(o.id) ?? 0).totalUSD;
  }, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
        <p className="text-sm text-ink-500">Real-time health across every organization on ShyftForce.</p>
      </header>

      {pastDueSubs.length > 0 && (
        <section className="card border-rose-200 dark:border-rose-500/30 bg-rose-50/40 dark:bg-rose-500/10 p-4 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-sm text-rose-900 dark:text-rose-200">{pastDueSubs.length} subscription{pastDueSubs.length === 1 ? "" : "s"} past due</div>
            <ul className="text-[11px] mt-1 space-y-0.5">
              {pastDueSubs.map((o) => (
                <li key={o.id}>
                  <Link href={`/platform/orgs/${o.id}`} className="underline hover:no-underline text-rose-700 dark:text-rose-300">{o.name}</Link> · {o.plan}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<DollarSign className="w-5 h-5" />} label="MRR" value={fmtMoney(mrrUSD)} sub={`${activeSubs} paying org${activeSubs === 1 ? "" : "s"}`} tone={mrrUSD > 0 ? "emerald" : "amber"} />
        <Stat icon={<Building2 className="w-5 h-5" />} label="Organizations" value={orgs} sub={`+${newOrgsThisWeek} this week`} tone="brand" />
        <Stat icon={<Users className="w-5 h-5" />} label="Users" value={users} sub={`${members} active members`} tone="ink" />
        <Stat icon={<TrendingUp className="w-5 h-5" />} label="On trial" value={trialOrgs} sub={`${activeSubs} converted`} tone={trialOrgs > 0 ? "brand" : "ink"} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Calendar className="w-5 h-5" />} label="Shifts" value={shifts} sub={`${openShifts} open`} tone="ink" />
        <Stat icon={<FileWarning className="w-5 h-5" />} label="Open incidents" value={incidentsOpen} tone={incidentsOpen > 0 ? "amber" : "ink"} />
        <Stat icon={<Wallet className="w-5 h-5" />} label="EWA pending" value={ewaPending} tone="ink" />
        <Stat icon={<PowerOff className="w-5 h-5" />} label="Suspended" value={suspendedCount} tone={suspendedCount > 0 ? "amber" : "ink"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="card overflow-hidden">
          <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Newest organizations</h3>
            <Link href="/platform/orgs" className="text-xs text-brand-600">View all →</Link>
          </header>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {latestOrgs.map((o) => (
              <li key={o.id} className="px-5 py-2.5">
                <Link href={`/platform/orgs/${o.id}`} className="flex items-center gap-3 hover:bg-ink-50/40 dark:hover:bg-ink-800/40 -mx-5 px-5 -my-2.5 py-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs">{(o.name[0] ?? "?").toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{o.name}</div>
                    <div className="text-[11px] text-ink-500">{o.industry ?? "no industry"} · {o.plan} · {relTime(o.createdAt)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card overflow-hidden">
          <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Newest users</h3>
            <Link href="/platform/users" className="text-xs text-brand-600">Search →</Link>
          </header>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {latestSignups.map((u) => (
              <li key={u.id} className="px-5 py-2.5">
                <div className="font-medium text-sm">{u.name}</div>
                <div className="text-[11px] text-ink-500">{u.email} · {relTime(u.createdAt)}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <PlatformMap />
    </div>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; tone: "ink" | "brand" | "amber" | "emerald" }) {
  const cls: Record<string, string> = {
    ink: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cls[tone]}`}>{icon}</div>
      <div>
        <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider">{label}</div>
        <div className="text-xl font-bold tracking-tight-2">{value}</div>
        {sub && <div className="text-[11px] text-ink-500">{sub}</div>}
      </div>
    </div>
  );
}
