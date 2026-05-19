import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { HardHat, ShieldCheck, AlertTriangle } from "lucide-react";
import { addDays } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RANGES = { week: 7, month: 30, quarter: 90 };

export default async function SafetyAcksReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const rangeKey = (sp.range ?? "week") as keyof typeof RANGES;
  const days = RANGES[rangeKey] ?? 7;
  const since = addDays(new Date(), -days);

  const [briefings, members] = await Promise.all([
    prisma.safetyBriefing.findMany({
      where: { organizationId: u.organizationId, postedAt: { gte: since } },
      include: {
        acks: { include: { member: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: { postedAt: "desc" },
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const totalMembers = members.length;
  const totalBriefings = briefings.length;
  const totalAcks = briefings.reduce((a, b) => a + b.acks.length, 0);
  const totalRequired = totalBriefings * totalMembers;
  const orgPct = totalRequired > 0 ? (totalAcks / totalRequired) * 100 : 100;

  // Per-member compliance %
  const memberAckCounts = new Map<string, { name: string; acked: number }>();
  for (const m of members) memberAckCounts.set(m.id, { name: m.user.name, acked: 0 });
  for (const b of briefings) {
    for (const a of b.acks) {
      if (memberAckCounts.has(a.memberId)) memberAckCounts.get(a.memberId)!.acked++;
    }
  }
  const memberRows = Array.from(memberAckCounts.entries())
    .map(([id, v]) => ({
      id, name: v.name, acked: v.acked,
      pct: totalBriefings > 0 ? (v.acked / totalBriefings) * 100 : 100,
    }))
    .sort((a, b) => a.pct - b.pct); // worst first — needs attention

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        eyebrow="Construction · Report"
        icon={ShieldCheck}
        title="Safety briefing compliance"
        subtitle="OSHA-grade audit trail. See ack rate over time and per-worker — flag who's missing too many."
      >
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-xl">
          {Object.keys(RANGES).map(k => (
            <Link key={k} href={`/reports/safety-acks?range=${k}`} className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${rangeKey === k ? "bg-white dark:bg-ink-900 shadow" : ""}`}>
              {k}
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* KPI */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`card p-4 ${orgPct < 80 ? "ring-1 ring-rose-300 dark:ring-rose-500/40" : ""}`}>
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Org compliance</div>
          <div className={`text-2xl font-bold tracking-tight-2 mt-1 ${orgPct >= 95 ? "text-emerald-600" : orgPct >= 80 ? "text-amber-600" : "text-rose-600"}`}>
            {orgPct.toFixed(0)}%
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5">{totalAcks}/{totalRequired} required acks</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Briefings posted</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">{totalBriefings}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">{(totalBriefings / days).toFixed(1)}/day</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Crew size</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">{totalMembers}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Missing acks</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1 text-rose-600">{totalRequired - totalAcks}</div>
        </div>
      </section>

      {/* Per-briefing list */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Briefings</h3>
        {briefings.length === 0 ? (
          <p className="text-sm text-ink-500">No briefings in this window.</p>
        ) : (
          <ul className="space-y-2">
            {briefings.map(b => {
              const pct = totalMembers > 0 ? (b.acks.length / totalMembers) * 100 : 100;
              return (
                <li key={b.id} className="card p-3">
                  <div className="flex items-center gap-3 mb-1">
                    <HardHat className={`w-4 h-4 ${pct >= 95 ? "text-emerald-600" : pct >= 80 ? "text-amber-600" : "text-rose-600"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{b.topic}</div>
                      <div className="text-[11px] text-ink-500">Posted {b.postedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                    </div>
                    <div className={`text-sm font-bold ${pct >= 95 ? "text-emerald-600" : pct >= 80 ? "text-amber-600" : "text-rose-600"}`}>
                      {pct.toFixed(0)}%
                    </div>
                    <div className="text-xs text-ink-500">{b.acks.length}/{totalMembers}</div>
                  </div>
                  <div className="w-full bg-ink-100 dark:bg-ink-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${pct >= 95 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Per-member compliance */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Per-worker compliance (worst first)</h3>
        {memberRows.length === 0 ? (
          <p className="text-sm text-ink-500">No data.</p>
        ) : (
          <ul className="space-y-1">
            {memberRows.slice(0, 20).map(m => (
              <li key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50">
                {m.pct < 80
                  ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  : <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                <span className="text-sm font-medium flex-1">{m.name}</span>
                <span className="text-xs text-ink-500">{m.acked}/{totalBriefings} acked</span>
                <span className={`text-sm font-bold w-12 text-right ${m.pct >= 95 ? "text-emerald-600" : m.pct >= 80 ? "text-amber-600" : "text-rose-600"}`}>
                  {m.pct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
