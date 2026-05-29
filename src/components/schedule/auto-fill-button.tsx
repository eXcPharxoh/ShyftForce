"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check, X, Users } from "lucide-react";

type Assignment = { shiftId: string; shiftLabel: string; memberId: string; memberName: string; hoursAfter: number };
type Skipped = { shiftId: string; shiftLabel: string; reason: string };

type Preview = {
  ok: boolean;
  assignments: Assignment[];
  skipped: Skipped[];
  totalOpen: number;
} | null;

/**
 * One-click bulk filler for a week's open shifts. Calls /api/schedule/auto-fill
 * with dryRun: true, shows a preview ("we'll assign X of Y, here's who and what
 * is being skipped + why"), and applies on confirm. The AI auto-scheduler is a
 * different button for when you want it to actually plan the week.
 */
export function AutoFillButton({ weekStart, openShiftCount }: { weekStart: string; openShiftCount: number }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "preview" | "apply">(null);
  const [preview, setPreview] = useState<Preview>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchPreview() {
    setBusy("preview"); setError(null); setPreview(null);
    setOpen(true);
    try {
      const res = await fetch("/api/schedule/auto-fill", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, dryRun: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to preview");
      setPreview(d);
    } catch (e: any) {
      setError(e.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    setBusy("apply"); setError(null);
    try {
      const res = await fetch("/api/schedule/auto-fill", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, dryRun: false }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to apply");
      setOpen(false);
      r.refresh();
    } catch (e: any) {
      setError(e.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        onClick={fetchPreview}
        disabled={openShiftCount === 0}
        title={openShiftCount === 0 ? "No open shifts this week" : "Auto-assign open shifts to available members"}
        className="btn-outline text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Auto-fill {openShiftCount > 0 && <span className="font-mono">({openShiftCount})</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ink-900 border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
            <header className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-ink-50">Auto-fill open shifts</h2>
                <p className="text-[12px] text-ink-400">Round-robin by lowest current hours · respects position + overlap + 40h cap</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-50"><X className="w-4 h-4" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {busy === "preview" && (
                <div className="flex items-center gap-2 text-sm text-ink-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Computing best fit…
                </div>
              )}

              {error && (
                <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">{error}</div>
              )}

              {preview && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Stat value={preview.totalOpen} label="Open shifts" tone="ink" />
                    <Stat value={preview.assignments.length} label="Will assign" tone="success" />
                    <Stat value={preview.skipped.length} label="Skipped" tone={preview.skipped.length > 0 ? "warn" : "ink"} />
                  </div>

                  {preview.assignments.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">Assignments</div>
                      <ul className="space-y-1 max-h-60 overflow-y-auto pr-1">
                        {preview.assignments.map((a) => (
                          <li key={a.shiftId} className="flex items-start gap-2 text-[12.5px] rounded-md bg-white/[0.03] px-3 py-2">
                            <Users className="w-3.5 h-3.5 text-brand-300 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-ink-100 truncate">{a.shiftLabel}</div>
                              <div className="text-[11px] text-ink-400 mt-0.5">→ <b className="text-ink-200">{a.memberName}</b> ({a.hoursAfter.toFixed(1)}h after)</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.skipped.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">Skipped — no eligible member</div>
                      <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {preview.skipped.map((s) => (
                          <li key={s.shiftId} className="text-[12.5px] rounded-md bg-amber-500/[0.06] border border-amber-500/20 px-3 py-2">
                            <div className="text-ink-100 truncate">{s.shiftLabel}</div>
                            <div className="text-[11px] text-amber-300 mt-0.5">{s.reason}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.assignments.length === 0 && preview.skipped.length === 0 && (
                    <div className="text-center text-sm text-ink-400 py-6">Nothing to assign — there are no open shifts.</div>
                  )}
                </>
              )}
            </div>

            <footer className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={apply}
                disabled={busy !== null || !preview || preview.assignments.length === 0}
                className="btn-primary text-sm"
              >
                {busy === "apply" ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</> : <><Check className="w-4 h-4" /> Assign {preview?.assignments.length ?? 0}</>}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: "ink" | "success" | "warn" }) {
  const cls = tone === "success" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-ink-200";
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] py-2">
      <div className={`text-lg font-bold ${cls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
    </div>
  );
}
