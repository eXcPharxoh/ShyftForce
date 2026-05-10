import { requireUser } from "@/lib/session";
import { liveLabor } from "@/lib/pos/labor";
import { recommendSendHome } from "@/lib/pos/recommender";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { SyncButton } from "@/components/pos/sync-button";
import { Activity, AlertTriangle, CheckCircle2, Wand2, MapPin, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LiveLaborPage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const window = (sp.window === "now_4h" || sp.window === "this_week" ? sp.window : "today") as "today" | "now_4h" | "this_week";
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const snapshots = await liveLabor({ organizationId: u.organizationId, window });
  const totalLabor = snapshots.reduce((a, s) => a + s.laborCostCents, 0);
  const totalRev   = snapshots.reduce((a, s) => a + s.grossSalesCents, 0);
  const orgLaborPct = totalRev > 0 ? (totalLabor / totalRev) * 100 : null;

  // Pull send-home recommendations across all locations (manager only)
  let allRecs: any[] = [];
  if (isManager) {
    const locs = await prisma.location.findMany({ where: { organizationId: u.organizationId } });
    for (const l of locs) {
      const recs = await recommendSendHome({ organizationId: u.organizationId, locationId: l.id });
      for (const r of recs) allRecs.push({ ...r, locationId: l.id, locationName: l.name });
    }
    allRecs.sort((a, b) => b.savingsCents - a.savingsCents);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Live operations"
        icon={Activity}
        title="Live Labor Cost"
        subtitle={`${snapshots.length} location${snapshots.length === 1 ? "" : "s"} · ${prettyWindow(window)}`}
      >
        <div className="flex items-center gap-1.5">
          <WindowChip current={window} value="now_4h" label="Last 4h" />
          <WindowChip current={window} value="today" label="Today" />
          <WindowChip current={window} value="this_week" label="This week" />
        </div>
        {isManager && <SyncButton />}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Total labor cost" value={`$${(totalLabor / 100).toFixed(0)}`} tone="ink" />
        <Stat label="Total revenue"    value={`$${(totalRev / 100).toFixed(0)}`} tone="ink" />
        <Stat label="Labor %" value={orgLaborPct == null ? "—" : `${orgLaborPct.toFixed(1)}%`} tone={orgLaborPct == null ? "ink" : orgLaborPct > 35 ? "rose" : orgLaborPct > 28 ? "amber" : "emerald"} />
      </div>

      {isManager && allRecs.length > 0 && (
        <section className="card overflow-hidden border-amber-200 dark:border-amber-500/30">
          <header className="px-5 py-3 border-b border-amber-100 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/10 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Recommended cuts</h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">These cuts preserve minimum staffing and save the most over the next 4 hours.</p>
            </div>
          </header>
          <ul className="divide-y divide-amber-100 dark:divide-amber-500/20">
            {allRecs.slice(0, 6).map((r) => (
              <li key={r.shiftId} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0"><Clock className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink-900 dark:text-ink-100">
                    Send {r.memberName} home · saves ${(r.savingsCents / 100).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">
                    {r.locationName} · {r.position} · {r.remainingHours.toFixed(1)}h remaining @ ${r.hourlyRate.toFixed(2)}/h
                  </div>
                </div>
                <Link href={`/schedule`} className="btn-outline text-xs">Adjust shift</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
          <h3 className="text-sm font-semibold">By location</h3>
        </header>
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {snapshots.map((s) => {
            const tone =
              s.status === "over"      ? "rose"
              : s.status === "on_target" ? "emerald"
              : s.status === "under"   ? "brand"
              : "ink";
            const toneCls: Record<string, string> = {
              rose:    "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15",
              emerald: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15",
              brand:   "text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/15",
              ink:     "text-ink-700 dark:text-ink-300 bg-ink-100 dark:bg-ink-800",
            };
            const Icon = s.status === "over" ? AlertTriangle : s.status === "on_target" ? CheckCircle2 : MapPin;
            return (
              <li key={s.locationId} className="px-5 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneCls[tone]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{s.locationName}</div>
                    <div className="text-[11px] text-ink-500 dark:text-ink-400">
                      {s.scheduledHours.toFixed(1)}h scheduled · ${(s.laborCostCents / 100).toFixed(0)} labor · ${(s.grossSalesCents / 100).toFixed(0)} revenue
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold tabular-nums ${tone === "rose" ? "text-rose-600 dark:text-rose-400" : tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-ink-900 dark:text-ink-100"}`}>
                      {s.laborPct == null ? "—" : `${s.laborPct.toFixed(1)}%`}
                    </div>
                    <div className="text-[10px] text-ink-500 dark:text-ink-400">
                      target {s.targetPct == null ? "—" : `${s.targetPct.toFixed(1)}%`}
                    </div>
                  </div>
                </div>
                {s.targetPct != null && s.laborPct != null && (
                  <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${s.status === "over" ? "bg-rose-500" : s.status === "under" ? "bg-brand-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(150, (s.laborPct / s.targetPct) * 100)}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
          {snapshots.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-ink-500 dark:text-ink-400">
              No locations yet. Add a location and connect a POS to see live labor%.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function prettyWindow(w: string) {
  if (w === "now_4h") return "Last 4 hours";
  if (w === "this_week") return "This week so far";
  return "Today so far";
}

function WindowChip({ current, value, label }: { current: string; value: string; label: string }) {
  const active = current === value;
  return (
    <Link href={`/reports/labor-live?window=${value}`} className={`text-xs px-3 py-1.5 rounded-full border transition ${active ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold" : "border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800"}`}>
      {label}
    </Link>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "ink" | "rose" | "amber" | "emerald" }) {
  const colors: Record<string, string> = {
    ink: "text-ink-900 dark:text-ink-50",
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 tracking-tight-2 ${colors[tone]}`}>{value}</div>
    </div>
  );
}
