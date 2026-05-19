"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Loader2, Plus, X, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Lane = {
  id: string; number: number; name: string | null; type: string; active: boolean;
  locationId: string; locationName: string;
};

const TYPE_TONE: Record<string, string> = {
  standard:      "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  express:       "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  self_checkout: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export function PosLanesClient({ initial, locations }: { initial: Lane[]; locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [locId, setLocId] = useState(locations[0]?.id ?? "");
  const [number, setNumber] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState<"standard" | "express" | "self_checkout">("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/pos-lanes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: locId, number, name: name.trim() || null, type }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); setNumber(n => n + 1); r.refresh();
  }

  async function remove(l: Lane) {
    const ok = await confirm({ title: `Delete lane #${l.number}?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/pos-lanes/${l.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== l.id));
  }

  // Group by location for display
  const byLoc: Record<string, Lane[]> = {};
  for (const l of items) {
    byLoc[l.locationName] = byLoc[l.locationName] ?? [];
    byLoc[l.locationName].push(l);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm" disabled={locations.length === 0}>
          <Plus className="w-4 h-4" /> New lane
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="card p-12 text-center">
          <ScanLine className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">Add a location first</h3>
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <ScanLine className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No lanes yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">Set up your front-end lanes so you can assign cashiers to specific registers.</p>
        </div>
      ) : (
        Object.entries(byLoc).map(([locName, lanes]) => (
          <section key={locName}>
            <h3 className="text-xs uppercase font-semibold tracking-wider text-ink-500 mb-2">{locName}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {lanes.map(l => (
                <div key={l.id} className="card p-3 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl ${TYPE_TONE[l.type] ?? TYPE_TONE.standard} flex items-center justify-center shrink-0`}>
                    <span className="font-bold text-sm">#{l.number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{l.name ?? `Lane ${l.number}`}</div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-500">{l.type.replace("_", " ")}</div>
                  </div>
                  <button onClick={() => remove(l)} aria-label="Delete" className="btn-ghost text-rose-600 p-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><ScanLine className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New lane</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Location</label>
                <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)} required>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Lane #</label>
                  <input className="input" type="number" min={1} max={999} value={number} onChange={(e) => setNumber(parseInt(e.target.value) || 1)} required />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
                    <option value="standard">Standard</option>
                    <option value="express">Express (10 items)</option>
                    <option value="self_checkout">Self-checkout</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Name / label (optional)</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Express, Tobacco, etc." />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
