"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Loader2, Plus, X, Trash2, Sun, Calendar } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Rule = {
  id: string;
  name: string;
  kind: string;
  startHour: number | null;
  endHour: number | null;
  dayOfWeek: number | null;
  holidayDates: string | null;
  multiplier: number;
  flatAddCents: number | null;
  active: boolean;
};

const KIND_META: Record<string, { label: string; icon: any; tone: string }> = {
  night:    { label: "Night",    icon: Moon,     tone: "indigo" },
  weekend:  { label: "Weekend",  icon: Sun,      tone: "amber" },
  holiday:  { label: "Holiday",  icon: Calendar, tone: "rose" },
  custom:   { label: "Custom",   icon: Plus,     tone: "ink" },
};

const PRESETS = [
  { name: "Night shift (+15%)",   kind: "night",   startHour: 22, endHour: 6,  dayOfWeek: null, holidayDates: [], multiplier: 1.15, flatAddCents: null, active: true },
  { name: "Weekend (+20%)",        kind: "weekend", startHour: null, endHour: null, dayOfWeek: null, holidayDates: [], multiplier: 1.20, flatAddCents: null, active: true },
  { name: "Holiday (+50%)",        kind: "holiday", startHour: null, endHour: null, dayOfWeek: null, holidayDates: [], multiplier: 1.50, flatAddCents: null, active: true },
];

export function ShiftDifferentialsClient({ initial }: { initial: Rule[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"night" | "weekend" | "holiday" | "custom">("night");
  const [startHour, setStartHour] = useState<number | "">(22);
  const [endHour, setEndHour] = useState<number | "">(6);
  const [dayOfWeek, setDayOfWeek] = useState<number | "">("");
  const [holidayDates, setHolidayDates] = useState("");
  const [multiplier, setMultiplier] = useState(1.15);
  const [flatAddCents, setFlatAddCents] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const dates = holidayDates.split(",").map(s => s.trim()).filter(Boolean);
    const res = await fetch("/api/shift-differentials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, kind,
        startHour: startHour === "" ? null : Number(startHour),
        endHour:   endHour   === "" ? null : Number(endHour),
        dayOfWeek: dayOfWeek === "" ? null : Number(dayOfWeek),
        holidayDates: dates,
        multiplier,
        flatAddCents: flatAddCents === "" ? null : Number(flatAddCents),
        active: true,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); r.refresh();
  }

  async function remove(rule: Rule) {
    const ok = await confirm({ title: `Delete "${rule.name}"?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/shift-differentials/${rule.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== rule.id));
  }

  async function seedPresets() {
    setBusy(true);
    for (const p of PRESETS) {
      await fetch("/api/shift-differentials", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
    }
    setBusy(false); r.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {items.length === 0 && (
          <button onClick={seedPresets} disabled={busy} className="btn-outline text-sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Seed presets
          </button>
        )}
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New rule</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Moon className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No differentials yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">Seed common night/weekend/holiday presets, or add your own.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(rule => {
            const meta = KIND_META[rule.kind] ?? KIND_META.custom;
            const Icon = meta.icon;
            const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            return (
              <li key={rule.id} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {rule.name}
                    <span className="ml-2 text-[10px] uppercase font-semibold tracking-wider text-ink-500">{meta.label}</span>
                    {!rule.active && <span className="ml-2 text-[10px] uppercase font-semibold tracking-wider text-rose-600">Inactive</span>}
                  </div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300 mt-0.5">
                    <b>×{rule.multiplier}</b>
                    {rule.flatAddCents ? ` + $${(rule.flatAddCents / 100).toFixed(2)}/hr` : ""}
                    {rule.startHour !== null && rule.endHour !== null && ` · ${rule.startHour}:00 → ${rule.endHour}:00`}
                    {rule.dayOfWeek !== null && ` · ${dayLabels[rule.dayOfWeek]}`}
                    {rule.holidayDates && ` · ${JSON.parse(rule.holidayDates).length} holiday date(s)`}
                  </div>
                </div>
                <button onClick={() => remove(rule)} aria-label="Delete rule" className="btn-ghost text-rose-600 text-xs">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Moon className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New differential</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Night shift (10p-6a)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kind</label>
                  <select className="input" value={kind} onChange={(e) => setKind(e.target.value as any)}>
                    <option value="night">Night</option>
                    <option value="weekend">Weekend</option>
                    <option value="holiday">Holiday</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="label">Multiplier</label>
                  <input className="input" type="number" step="0.05" min={1} max={5} value={multiplier} onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)} />
                </div>
              </div>
              {(kind === "night" || kind === "custom") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Start hour (0-23)</label>
                    <input className="input" type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(e.target.value === "" ? "" : parseInt(e.target.value))} />
                  </div>
                  <div>
                    <label className="label">End hour (0-23)</label>
                    <input className="input" type="number" min={0} max={23} value={endHour} onChange={(e) => setEndHour(e.target.value === "" ? "" : parseInt(e.target.value))} />
                  </div>
                </div>
              )}
              {(kind === "weekend" || kind === "custom") && (
                <div>
                  <label className="label">Day of week (0=Sun, 6=Sat — blank = both Sat &amp; Sun)</label>
                  <input className="input" type="number" min={0} max={6} value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value === "" ? "" : parseInt(e.target.value))} />
                </div>
              )}
              {kind === "holiday" && (
                <div>
                  <label className="label">Holiday dates (comma-separated YYYY-MM-DD)</label>
                  <input className="input" value={holidayDates} onChange={(e) => setHolidayDates(e.target.value)} placeholder="2026-12-25, 2026-01-01, 2026-07-04" />
                </div>
              )}
              <div>
                <label className="label">Flat add (¢/hr — optional)</label>
                <input className="input" type="number" min={0} max={10000} value={flatAddCents} onChange={(e) => setFlatAddCents(e.target.value === "" ? "" : parseInt(e.target.value))} placeholder="e.g. 200 = +$2.00/hr" />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add rule
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
