import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Image as ImageIcon, Check, AlertTriangle } from "lucide-react";
import { addDays } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RANGES = { week: 7, month: 30, quarter: 90 };

export default async function VmCompletionReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const rangeKey = (sp.range ?? "month") as keyof typeof RANGES;
  const days = RANGES[rangeKey] ?? 30;
  const since = addDays(new Date(), -days);
  const now = new Date();

  const tasks = await prisma.vmTask.findMany({
    where: {
      organizationId: u.organizationId,
      createdAt: { gte: since },
    },
    include: {
      assignedTo: { include: { user: { select: { name: true } } } },
      submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const open = tasks.filter(t => t.status === "open").length;
  const overdue = tasks.filter(t => t.status === "open" && t.dueDate && t.dueDate < now).length;
  const completionPct = total > 0 ? (done / total) * 100 : 0;

  // Photo proof rate
  const requiredPhoto = tasks.filter(t => t.status === "done" && t.requirePhoto);
  const withPhoto = requiredPhoto.filter(t => t.submissions[0]?.photoData).length;
  const photoRate = requiredPhoto.length > 0 ? (withPhoto / requiredPhoto.length) * 100 : 100;

  // Per-assignee rollup
  const byAssignee = new Map<string, { name: string; assigned: number; done: number; overdue: number; avgDays: number; daySum: number }>();
  for (const t of tasks) {
    const name = t.assignedTo?.user.name ?? "(unassigned)";
    const key = t.assignedToMemberId ?? "unassigned";
    if (!byAssignee.has(key)) byAssignee.set(key, { name, assigned: 0, done: 0, overdue: 0, avgDays: 0, daySum: 0 });
    const v = byAssignee.get(key)!;
    v.assigned++;
    if (t.status === "done") {
      v.done++;
      const sub = t.submissions[0];
      if (sub) {
        const daysToFinish = (+sub.submittedAt - +t.createdAt) / 86400_000;
        v.daySum += daysToFinish;
      }
    }
    if (t.status === "open" && t.dueDate && t.dueDate < now) v.overdue++;
  }
  const assigneeRanked = Array.from(byAssignee.values())
    .map(v => ({ ...v, completionPct: v.assigned > 0 ? (v.done / v.assigned) * 100 : 0, avgDays: v.done > 0 ? v.daySum / v.done : 0 }))
    .sort((a, b) => b.completionPct - a.completionPct);

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        eyebrow="Retail · Report"
        icon={ImageIcon}
        title="Visual merchandising completion"
        subtitle="Endcap / display / floor-reset task throughput. Used for brand-compliance audits and weekly visual reviews."
      >
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-xl">
          {Object.keys(RANGES).map(k => (
            <Link key={k} href={`/reports/vm-completion?range=${k}`} className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${rangeKey === k ? "bg-white dark:bg-ink-900 shadow" : ""}`}>
              {k}
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* KPI */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Completion rate</div>
          <div className={`text-2xl font-bold tracking-tight-2 mt-1 ${completionPct >= 80 ? "text-emerald-600" : completionPct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
            {completionPct.toFixed(0)}%
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5">{done}/{total}</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Overdue</div>
          <div className={`text-2xl font-bold tracking-tight-2 mt-1 ${overdue === 0 ? "text-emerald-600" : "text-rose-600"}`}>{overdue}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">{open} still open</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Photo-proof rate</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">{photoRate.toFixed(0)}%</div>
          <div className="text-[11px] text-ink-500 mt-0.5">{withPhoto}/{requiredPhoto.length} req'd photos</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Tasks issued</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">{total}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">{(total / days).toFixed(1)}/day</div>
        </div>
      </section>

      {/* Per-assignee */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Per-assignee completion</h3>
        {assigneeRanked.length === 0 ? (
          <p className="text-sm text-ink-500">No tasks in this period.</p>
        ) : (
          <ul className="space-y-1">
            {assigneeRanked.map(v => (
              <li key={v.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50">
                {v.completionPct >= 80
                  ? <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{v.name}</div>
                  <div className="text-[11px] text-ink-500">
                    {v.done}/{v.assigned} done
                    {v.avgDays > 0 && ` · ${v.avgDays.toFixed(1)} days avg`}
                    {v.overdue > 0 && ` · ${v.overdue} overdue`}
                  </div>
                </div>
                <span className={`text-sm font-bold ${v.completionPct >= 80 ? "text-emerald-600" : v.completionPct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                  {v.completionPct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
