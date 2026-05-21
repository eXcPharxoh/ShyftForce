"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

/**
 * Live labor% chip — shown in the schedule header so managers see the
 * impact of edits in real-time. Polls /api/reports/live-labor every 30s.
 *
 * Color band:
 *   green  ≤ 28%   on-target
 *   amber  28–35%  watch
 *   red    > 35%   over-budget
 */
export function LiveLaborChip({ window = "today" as "today" | "now_4h" | "this_week" }) {
  const [pct, setPct] = useState<number | null>(null);
  const [labor, setLabor] = useState<number>(0);
  const [rev, setRev] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch(`/api/reports/live-labor?window=${window}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        setPct(d.pct);
        setLabor(d.laborCents ?? 0);
        setRev(d.revenueCents ?? 0);
        setLoaded(true);
      } catch { /* swallow */ }
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [window]);

  if (!loaded) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.08] bg-white/[0.02] text-[11px] text-ink-500 font-mono">
        <Activity className="w-3 h-3 animate-pulse" />
        <span>Labor —</span>
      </div>
    );
  }

  const tone =
    pct == null ? "mute" :
    pct > 35    ? "danger" :
    pct > 28    ? "warn" :
                  "success";

  const toneCls =
    tone === "danger"  ? "border-rose-500/40 bg-rose-500/10 text-rose-300" :
    tone === "warn"    ? "border-amber-500/40 bg-amber-500/10 text-amber-300" :
    tone === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" :
                         "border-white/[0.08] bg-white/[0.02] text-ink-300";

  return (
    <Link
      href="/reports/labor-live"
      title={`$${(labor / 100).toFixed(0)} labor · $${(rev / 100).toFixed(0)} revenue (today)`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono transition hover:brightness-110 ${toneCls}`}
    >
      <Activity className="w-3 h-3" />
      <span>Labor {pct == null ? "—" : `${pct.toFixed(1)}%`}</span>
    </Link>
  );
}
