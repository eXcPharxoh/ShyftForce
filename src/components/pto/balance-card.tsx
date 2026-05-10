import type { BalanceSnapshot } from "@/lib/pto/service";
import { Cake, Coffee, Heart, Plane, MoreHorizontal } from "lucide-react";

const ICONS: Record<string, any> = {
  vacation:    Plane,
  sick:        Heart,
  personal:    Coffee,
  bereavement: Cake,
  unpaid:      MoreHorizontal,
};

export function PtoBalanceCard({ balances, compact = false }: { balances: BalanceSnapshot[]; compact?: boolean }) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="h-section">{compact ? "Time-off balance" : "Your time-off balance"}</h3>
        <span className="text-[11px] text-ink-500 dark:text-ink-400">In hours · {balances[0]?.hoursPerDay ?? 8}h = 1 day</span>
      </div>
      <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 lg:grid-cols-3 gap-3"}>
        {balances.map(b => <Tile key={b.policyId} b={b} compact={compact} />)}
      </div>
    </section>
  );
}

function Tile({ b, compact }: { b: BalanceSnapshot; compact: boolean }) {
  const Icon = ICONS[b.category] ?? Plane;
  const days = b.unlimited ? null : b.available / b.hoursPerDay;
  const pct = b.unlimited || b.annualHours <= 0 ? 100 : Math.max(0, Math.min(100, (b.available / b.annualHours) * 100));
  const tone = b.unlimited ? "ink" : b.available <= 0 ? "rose" : b.available <= b.hoursPerDay ? "amber" : "emerald";
  const toneCls: Record<string, { fg: string; bar: string; bg: string }> = {
    emerald: { fg: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    amber:   { fg: "text-amber-700 dark:text-amber-300",     bar: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-500/10" },
    rose:    { fg: "text-rose-700 dark:text-rose-300",       bar: "bg-rose-500",    bg: "bg-rose-50 dark:bg-rose-500/10" },
    ink:     { fg: "text-ink-700 dark:text-ink-300",         bar: "bg-ink-400",     bg: "bg-ink-50 dark:bg-ink-800/40" },
  };
  const cls = toneCls[tone];
  return (
    <div className={`rounded-xl border border-ink-200 dark:border-ink-800 ${cls.bg} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${cls.fg}`} />
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-300">{b.name}</div>
      </div>
      {b.unlimited ? (
        <div className="text-2xl font-bold tracking-tight-2 text-ink-900 dark:text-ink-100">Unlimited</div>
      ) : (
        <>
          <div className={`text-2xl font-bold tracking-tight-2 tabular-nums ${cls.fg}`}>{b.available.toFixed(1)}h</div>
          <div className="text-[11px] text-ink-500 dark:text-ink-400">≈ {days!.toFixed(1)} days · used {b.used.toFixed(0)}h of {b.accrued.toFixed(0)}h</div>
          <div className="mt-1.5 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
            <div className={`h-full rounded-full ${cls.bar} transition-all`} style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
