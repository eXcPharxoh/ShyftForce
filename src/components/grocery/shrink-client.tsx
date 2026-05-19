"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash, Loader2, Plus, X } from "lucide-react";

type Event = {
  id: string; reason: string; productName: string; sku: string | null;
  quantity: number; unitValueCents: number; totalValueCents: number;
  notes: string | null; occurredAt: string;
  reportedByName: string | null;
};

const REASONS = [
  { v: "damage",   l: "Damage",   tone: "amber" },
  { v: "spoilage", l: "Spoilage", tone: "lime" },
  { v: "expired",  l: "Expired",  tone: "ink" },
  { v: "theft",    l: "Theft",    tone: "rose" },
  { v: "return",   l: "Return",   tone: "indigo" },
  { v: "other",    l: "Other",    tone: "slate" },
];

const TONE: Record<string, string> = {
  amber:  "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  lime:   "bg-lime-50 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
  ink:    "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300",
  rose:   "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  slate:  "bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

export function ShrinkClient({
  initial, locations, departments,
}: {
  initial: Event[];
  locations: { id: string; name: string }[];
  departments: { id: string; name: string; color: string }[];
}) {
  const r = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("damage");
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitDollars, setUnitDollars] = useState<number | "">(0);
  const [locId, setLocId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/shrink-events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason, productName: productName.trim(), sku: sku.trim() || null,
        quantity, unitValueCents: Math.round(Number(unitDollars || 0) * 100),
        locationId: locId || null, departmentId: deptId || null,
        notes: notes.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setProductName(""); setSku(""); setQuantity(1); setUnitDollars(0); setNotes("");
    r.refresh();
  }

  function fmtTime(d: string) {
    return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Log shrink</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Trash className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No shrink logged in the last 30 days</h3>
          <p className="text-sm text-ink-500 mt-1">When perishables spoil or merch is damaged, log it here to spot patterns.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(e => {
            const meta = REASONS.find(r => r.v === e.reason) ?? REASONS[5];
            return (
              <li key={e.id} className="card p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${TONE[meta.tone]} flex items-center justify-center shrink-0`}>
                  <Trash className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {e.productName}
                    {e.sku && <span className="text-ink-500 font-normal text-xs"> · {e.sku}</span>}
                    <span className={`ml-2 text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${TONE[meta.tone]}`}>{meta.l}</span>
                  </div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300">
                    <b>${(e.totalValueCents / 100).toFixed(2)}</b> · {e.quantity}× @ ${(e.unitValueCents / 100).toFixed(2)} · {fmtTime(e.occurredAt)}
                    {e.reportedByName && ` · ${e.reportedByName}`}
                  </div>
                  {e.notes && <div className="text-[11px] text-ink-500 mt-0.5">{e.notes}</div>}
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
              <div className="flex items-center gap-2"><Trash className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Log shrink</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Reason</label>
                <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {REASONS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Product *</label>
                <input className="input" value={productName} onChange={(e) => setProductName(e.target.value)} required maxLength={120} placeholder="Strawberries, T-shirt M, etc." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">SKU</label>
                  <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} maxLength={40} />
                </div>
                <div>
                  <label className="label">Qty</label>
                  <input className="input" type="number" step="0.01" min={0} max={10000} value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="label">Unit $</label>
                  <input className="input" type="number" step="0.01" min={0} value={unitDollars} onChange={(e) => setUnitDollars(e.target.value === "" ? "" : parseFloat(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Location</label>
                  <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                    <option value="">—</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select className="input" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                    <option value="">—</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </div>
              <div className="text-xs text-ink-500">
                Total: <b>${(quantity * Number(unitDollars || 0)).toFixed(2)}</b>
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
