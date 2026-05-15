import { atRiskMembers } from "@/lib/turnover/score";
import { AlertOctagon, TrendingDown, Users } from "lucide-react";
import Link from "next/link";

// Server component — runs the scoring at render time. Cheap enough for now
// (per-org member count × ~60 days of activity logs).
export async function TurnoverWidget({ organizationId }: { organizationId: string }) {
  const at = await atRiskMembers(organizationId, "medium");
  const high = at.filter(a => a.band === "high").length;

  if (at.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold">Retention health</h3>
        </div>
        <p className="text-xs text-ink-500 dark:text-ink-400">No at-risk team members detected. Recognition, schedule consistency, and engagement are all healthy. ✨</p>
      </div>
    );
  }

  return (
    <div className="card p-5 border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${high > 0 ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
            {high > 0 ? <AlertOctagon className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Turnover risk</h3>
            <p className="text-[11px] text-ink-500">
              {at.length} at-risk member{at.length === 1 ? "" : "s"}
              {high > 0 ? ` · ${high} high` : ""}
            </p>
          </div>
        </div>
        <span className="badge-orange text-[10px]">AI insight</span>
      </div>

      <ul className="space-y-2">
        {at.slice(0, 5).map(r => (
          <li key={r.memberId} className="rounded-xl border border-ink-200 dark:border-ink-800 bg-white/60 dark:bg-ink-900 p-3">
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
                r.band === "high"
                  ? "bg-rose-500 text-white"
                  : "bg-amber-400 text-white"
              }`}>{r.score}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/hr/members/${r.memberId}`} className="font-semibold text-sm text-ink-900 dark:text-ink-50 hover:text-brand-600">{r.memberName}</Link>
                  <span className="text-[11px] text-ink-500">{r.position ?? "—"}{r.locationName ? ` · ${r.locationName}` : ""}</span>
                </div>
                <ul className="text-[11px] text-ink-700 dark:text-ink-300 mt-1 space-y-0.5">
                  {r.topFactors.slice(0, 3).map(f => (
                    <li key={f.key}>
                      <span className="inline-block w-1 h-1 rounded-full bg-rose-500 align-middle mr-1.5" />
                      <b>{f.label}</b> <span className="text-ink-500">— {f.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {at.length > 5 && (
        <p className="text-[11px] text-ink-500 mt-2 text-center">+ {at.length - 5} more — full list in HR → Members.</p>
      )}
    </div>
  );
}
