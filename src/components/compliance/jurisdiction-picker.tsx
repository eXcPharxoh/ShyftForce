"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check, Loader2, ChevronDown } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Jurisdiction = {
  id: string; label: string; region: string;
  predictiveSchedulingDays: number; hasPredictabilityPay: boolean;
  mealBreakAfterHours: number; restBreakAfterHours: number;
  minRestGapHours: number; notes?: string;
};

export function JurisdictionPicker({ current, options }: { current: string; options: Jurisdiction[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cur = options.find((o) => o.id === current) ?? options[0];

  async function apply(id: string) {
    if (id === current) { setOpen(false); return; }
    const label = options.find(o => o.id === id)?.label ?? "this jurisdiction";
    const ok = await confirm({
      title: `Apply ${label}'s rule pack?`,
      description: "This overwrites your current compliance settings. You can fine-tune individual rules afterwards.",
      tone: "warning",
      confirmLabel: "Apply rules",
    });
    if (!ok) return;
    setBusy(id); setError(null);
    const res = await fetch("/api/compliance/jurisdiction", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jurisdictionId: id }),
    });
    const data = await res.json();
    setBusy(null); setOpen(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    r.refresh();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-outline text-xs">
        <Globe className="w-4 h-4" />
        {cur?.label ?? "Choose jurisdiction"}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-96 max-h-[70vh] overflow-y-auto card p-2 animate-scale-in origin-top-right scroll-thin">
            {options.map((j) => {
              const isActive = j.id === current;
              return (
                <button
                  key={j.id}
                  onClick={() => apply(j.id)}
                  disabled={!!busy}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-start gap-2.5 ${isActive ? "bg-brand-50 dark:bg-brand-500/15" : "hover:bg-ink-100 dark:hover:bg-ink-800"}`}
                >
                  <div className="w-6 h-6 rounded-md mt-0.5 flex items-center justify-center shrink-0 bg-ink-100 dark:bg-ink-800">
                    {busy === j.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-500" />
                      : isActive
                        ? <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        : <Globe className="w-3.5 h-3.5 text-ink-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">{j.label}</div>
                    <div className="text-[11px] text-ink-500 dark:text-ink-400">{j.region}</div>
                    <div className="text-[11px] text-ink-700 dark:text-ink-300 mt-1">
                      {j.predictiveSchedulingDays > 0 ? `📜 ${j.predictiveSchedulingDays}d advance schedule` : "📜 No Fair Workweek"}
                      {" · "}{j.hasPredictabilityPay ? "💰 Predictability pay" : "no predictability pay"}
                      {" · "}🛌 {j.minRestGapHours}h rest gap
                    </div>
                    {j.notes && <div className="text-[10px] text-ink-500 dark:text-ink-400 mt-1 italic line-clamp-2">{j.notes}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      {error && <div className="absolute right-0 top-11 mt-12 text-rose-600 text-[11px]">{error}</div>}
    </div>
  );
}
