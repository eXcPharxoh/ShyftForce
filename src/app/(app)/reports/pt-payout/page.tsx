import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { UserCheck, DollarSign } from "lucide-react";
import { addDays } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RANGES = { week: 7, month: 30, quarter: 90 };

export default async function PtPayoutReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const rangeKey = (sp.range ?? "month") as keyof typeof RANGES;
  const days = RANGES[rangeKey] ?? 30;
  const since = addDays(new Date(), -days);

  const sessions = await prisma.ptSession.findMany({
    where: { organizationId: u.organizationId, startsAt: { gte: since } },
    include: { trainer: { include: { user: { select: { name: true } } } } },
    orderBy: { startsAt: "desc" },
  });

  // Per-trainer rollup
  const byTrainer = new Map<string, { name: string; booked: number; done: number; noShow: number; cancelled: number; gross: number; payout: number }>();
  for (const s of sessions) {
    const key = s.trainerMemberId;
    if (!byTrainer.has(key)) byTrainer.set(key, { name: s.trainer.user.name, booked: 0, done: 0, noShow: 0, cancelled: 0, gross: 0, payout: 0 });
    const v = byTrainer.get(key)!;
    v.booked++;
    if (s.status === "done") {
      v.done++;
      v.gross += s.rateCents;
      v.payout += Math.round(s.rateCents * s.trainerSplitPct / 100);
    } else if (s.status === "no_show") v.noShow++;
    else if (s.status === "cancelled") v.cancelled++;
  }
  const trainerRanked = Array.from(byTrainer.values()).sort((a, b) => b.payout - a.payout);

  const totalSessions = sessions.length;
  const totalDone = sessions.filter(s => s.status === "done").length;
  const totalGross = sessions.filter(s => s.status === "done").reduce((a, s) => a + s.rateCents, 0);
  const totalPayout = sessions.filter(s => s.status === "done").reduce((a, s) => a + Math.round(s.rateCents * s.trainerSplitPct / 100), 0);
  const houseProfit = totalGross - totalPayout;
  const noShowRate = totalSessions > 0 ? (sessions.filter(s => s.status === "no_show").length / totalSessions) * 100 : 0;

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        eyebrow="Fitness · Report"
        icon={DollarSign}
        title="Personal training payout"
        subtitle="Revenue, trainer payouts, and house margin per period. Drop into payroll."
      >
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-xl">
          {Object.keys(RANGES).map(k => (
            <Link key={k} href={`/reports/pt-payout?range=${k}`} className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${rangeKey === k ? "bg-white dark:bg-ink-900 shadow" : ""}`}>
              {k}
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* KPI */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Gross revenue</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">${(totalGross / 100).toLocaleString()}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">{totalDone} done</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Trainer payouts</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">${(totalPayout / 100).toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">House margin</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1 text-emerald-600">${(houseProfit / 100).toLocaleString()}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">{totalGross > 0 ? ((houseProfit / totalGross) * 100).toFixed(0) : 0}% margin</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">No-show rate</div>
          <div className={`text-2xl font-bold tracking-tight-2 mt-1 ${noShowRate < 5 ? "text-emerald-600" : noShowRate < 10 ? "text-amber-600" : "text-rose-600"}`}>
            {noShowRate.toFixed(1)}%
          </div>
        </div>
      </section>

      {/* Per-trainer table */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Per-trainer payout</h3>
        {trainerRanked.length === 0 ? (
          <p className="text-sm text-ink-500">No sessions in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-[10px] uppercase tracking-wider text-ink-500">
                <tr className="border-b border-ink-200 dark:border-ink-800">
                  <th className="text-left py-2">Trainer</th>
                  <th className="text-right">Booked</th>
                  <th className="text-right">Done</th>
                  <th className="text-right">No-show</th>
                  <th className="text-right">Cancelled</th>
                  <th className="text-right">Gross</th>
                  <th className="text-right">Payout</th>
                </tr>
              </thead>
              <tbody>
                {trainerRanked.map((t, i) => (
                  <tr key={t.name} className="border-b border-ink-100 dark:border-ink-800 hover:bg-ink-50/50 dark:hover:bg-ink-800/50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-brand-500" />
                        <span className="font-semibold">{t.name}</span>
                        {i === 0 && <span className="text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold">TOP</span>}
                      </div>
                    </td>
                    <td className="text-right">{t.booked}</td>
                    <td className="text-right text-emerald-700 dark:text-emerald-400 font-semibold">{t.done}</td>
                    <td className="text-right text-rose-600">{t.noShow}</td>
                    <td className="text-right text-ink-500">{t.cancelled}</td>
                    <td className="text-right">${(t.gross / 100).toFixed(0)}</td>
                    <td className="text-right font-bold">${(t.payout / 100).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-200 dark:border-ink-800 font-bold">
                  <td className="py-2.5 text-right">Totals</td>
                  <td className="text-right">{trainerRanked.reduce((a, t) => a + t.booked, 0)}</td>
                  <td className="text-right">{trainerRanked.reduce((a, t) => a + t.done, 0)}</td>
                  <td className="text-right">{trainerRanked.reduce((a, t) => a + t.noShow, 0)}</td>
                  <td className="text-right">{trainerRanked.reduce((a, t) => a + t.cancelled, 0)}</td>
                  <td className="text-right">${(totalGross / 100).toLocaleString()}</td>
                  <td className="text-right">${(totalPayout / 100).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
