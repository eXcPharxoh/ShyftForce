import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Trash, TrendingUp } from "lucide-react";
import { addDays } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RANGES = { week: 7, month: 30, quarter: 90 };

export default async function ShrinkReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const rangeKey = (sp.range ?? "month") as keyof typeof RANGES;
  const days = RANGES[rangeKey] ?? 30;
  const since = addDays(new Date(), -days);
  const prevSince = addDays(since, -days);

  const [events, prevEvents, departments] = await Promise.all([
    prisma.shrinkEvent.findMany({
      where: { organizationId: u.organizationId, occurredAt: { gte: since } },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.shrinkEvent.aggregate({
      where: { organizationId: u.organizationId, occurredAt: { gte: prevSince, lt: since } },
      _sum: { totalValueCents: true },
      _count: { _all: true },
    }),
    prisma.department.findMany({
      where: { organizationId: u.organizationId },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const totalCents = events.reduce((a, e) => a + e.totalValueCents, 0);
  const prevTotalCents = prevEvents._sum.totalValueCents ?? 0;
  const change = prevTotalCents > 0 ? ((totalCents - prevTotalCents) / prevTotalCents) * 100 : null;

  // Breakdown by reason
  const byReason: Record<string, { count: number; valueCents: number }> = {};
  for (const e of events) {
    byReason[e.reason] = byReason[e.reason] ?? { count: 0, valueCents: 0 };
    byReason[e.reason].count++;
    byReason[e.reason].valueCents += e.totalValueCents;
  }
  const reasonRanked = Object.entries(byReason).sort((a, b) => b[1].valueCents - a[1].valueCents);

  // Breakdown by department
  const deptMap = new Map(departments.map(d => [d.id, d]));
  const byDept: Record<string, { count: number; valueCents: number; name: string; color: string }> = {};
  for (const e of events) {
    const key = e.departmentId ?? "unassigned";
    if (!byDept[key]) {
      const d = e.departmentId ? deptMap.get(e.departmentId) : null;
      byDept[key] = { count: 0, valueCents: 0, name: d?.name ?? "Unassigned", color: d?.color ?? "#94a3b8" };
    }
    byDept[key].count++;
    byDept[key].valueCents += e.totalValueCents;
  }
  const deptRanked = Object.entries(byDept).sort((a, b) => b[1].valueCents - a[1].valueCents);

  // Weekly trend (rolling buckets)
  const buckets: { weekStart: Date; cents: number }[] = [];
  if (events.length > 0) {
    const bucketCount = Math.ceil(days / 7);
    for (let i = 0; i < bucketCount; i++) {
      buckets.push({ weekStart: addDays(since, i * 7), cents: 0 });
    }
    for (const e of events) {
      const diffDays = Math.floor((+e.occurredAt - +since) / 86400_000);
      const idx = Math.min(Math.floor(diffDays / 7), buckets.length - 1);
      if (idx >= 0) buckets[idx].cents += e.totalValueCents;
    }
  }
  const maxBucket = Math.max(1, ...buckets.map(b => b.cents));

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        eyebrow="Grocery · Report"
        icon={Trash}
        title="Shrink trends"
        subtitle="Spot patterns by department, reason, and over time. Use it for monthly P&amp;L meetings + asset-protection reviews."
      >
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-xl">
          {Object.keys(RANGES).map(k => (
            <Link key={k} href={`/reports/shrink?range=${k}`} className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${rangeKey === k ? "bg-white dark:bg-ink-900 shadow" : ""}`}>
              {k}
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Total shrink</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">${(totalCents / 100).toLocaleString()}</div>
          {change !== null && (
            <div className={`text-[11px] flex items-center gap-1 mt-0.5 ${change > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              <TrendingUp className={`w-3 h-3 ${change <= 0 && "rotate-180"}`} />
              {change > 0 ? "+" : ""}{change.toFixed(0)}% vs prior {rangeKey}
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Events logged</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">{events.length}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">{(events.length / days).toFixed(1)}/day avg</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Avg event value</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">${events.length > 0 ? ((totalCents / 100) / events.length).toFixed(2) : "0"}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Top reason</div>
          <div className="text-base font-bold tracking-tight-2 mt-1 capitalize">{reasonRanked[0]?.[0] ?? "—"}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">${reasonRanked[0] ? ((reasonRanked[0][1].valueCents) / 100).toFixed(0) : "0"} lost</div>
        </div>
      </section>

      {/* Weekly trend */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-4">Weekly trend ({rangeKey})</h3>
        {buckets.length === 0 ? (
          <p className="text-sm text-ink-500">No shrink in this window.</p>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {buckets.map((b, i) => {
              const h = (b.cents / maxBucket) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] text-ink-500">${(b.cents / 100).toFixed(0)}</div>
                  <div className="w-full bg-rose-200 dark:bg-rose-500/30 rounded-t" style={{ height: `${Math.max(2, h)}%` }} />
                  <div className="text-[10px] text-ink-500">{b.weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {/* By reason */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold mb-3">By reason</h3>
          {reasonRanked.length === 0 ? (
            <p className="text-sm text-ink-500">No data.</p>
          ) : (
            <ul className="space-y-2">
              {reasonRanked.map(([reason, v]) => {
                const pct = totalCents > 0 ? (v.valueCents / totalCents) * 100 : 0;
                return (
                  <li key={reason}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize font-semibold">{reason}</span>
                      <span className="text-ink-500"><b>${(v.valueCents / 100).toFixed(0)}</b> · {v.count} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-ink-100 dark:bg-ink-800 rounded-full h-2">
                      <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* By department */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold mb-3">By department</h3>
          {deptRanked.length === 0 ? (
            <p className="text-sm text-ink-500">No data.</p>
          ) : (
            <ul className="space-y-2">
              {deptRanked.map(([deptId, v]) => {
                const pct = totalCents > 0 ? (v.valueCents / totalCents) * 100 : 0;
                return (
                  <li key={deptId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} />
                        {v.name}
                      </span>
                      <span className="text-ink-500"><b>${(v.valueCents / 100).toFixed(0)}</b> · {v.count}</span>
                    </div>
                    <div className="w-full bg-ink-100 dark:bg-ink-800 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: v.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
