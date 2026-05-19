"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2, Plus, X } from "lucide-react";

type Event = {
  id: string; type: string; description: string;
  valueCents: number | null; occurredAt: string;
  reportedByName: string | null;
};

const TYPES = [
  { v: "shoplift",       l: "Shoplift",       tone: "rose"   },
  { v: "register_error", l: "Register error", tone: "amber"  },
  { v: "breakage",       l: "Breakage",       tone: "indigo" },
  { v: "refund_fraud",   l: "Refund fraud",   tone: "fuchsia"},
  { v: "sweethearting",  l: "Sweethearting",  tone: "pink"   },
  { v: "other",          l: "Other",          tone: "slate"  },
];

const TONE: Record<string, string> = {
  rose:    "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  amber:   "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  indigo:  "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  fuchsia: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  pink:    "bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  slate:   "bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export function LossPreventionClient({ initial, locations }: { initial: Event[]; locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("shoplift");
  const [description, setDescription] = useState("");
  const [valueDollars, setValueDollars] = useState<number | "">("");
  const [locId, setLocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/lp-events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type, description: description.trim(),
        valueCents: valueDollars === "" ? null : Math.round(Number(valueDollars) * 100),
        locationId: locId || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setDescription(""); setValueDollars(""); r.refresh();
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Log event</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <ShieldAlert className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No events in the last 30 days</h3>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(e => {
            const meta = TYPES.find(t => t.v === e.type) ?? TYPES[5];
            return (
              <li key={e.id} className="card p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${TONE[meta.tone]} flex items-center justify-center shrink-0`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {e.description}
                    <span className={`ml-2 text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${TONE[meta.tone]}`}>{meta.l}</span>
                  </div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300">
                    {e.valueCents !== null && <><b>${(e.valueCents / 100).toFixed(2)}</b> · </>}
                    {fmt(e.occurredAt)}
                    {e.reportedByName && ` · ${e.reportedByName}`}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Log LP event</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Type</label>
                <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={1000} placeholder="What happened?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Value ($, optional)</label>
                  <input className="input" type="number" step="0.01" min={0} value={valueDollars} onChange={(e) => setValueDollars(e.target.value === "" ? "" : parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                    <option value="">—</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Log
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
