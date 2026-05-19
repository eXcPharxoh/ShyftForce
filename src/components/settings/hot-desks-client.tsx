"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Armchair, Loader2, Plus, X, Monitor } from "lucide-react";

type Desk = { id: string; name: string; zone: string | null; hasMonitor: boolean; hasStanding: boolean; active: boolean; locationId: string | null };

export function HotDesksClient({ initial, locations }: { initial: Desk[]; locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [hasMonitor, setHasMonitor] = useState(false);
  const [hasStanding, setHasStanding] = useState(false);
  const [locId, setLocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/hot-desks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), zone: zone.trim() || null, hasMonitor, hasStanding, locationId: locId || null }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); r.refresh();
  }

  async function bulkCreate(prefix: string, count: number, zone: string) {
    setBusy(true);
    for (let i = 1; i <= count; i++) {
      await fetch("/api/hot-desks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${prefix} ${i}`, zone, hasMonitor: true, hasStanding: false }),
      });
    }
    setBusy(false); r.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {initial.length === 0 && (
          <button onClick={() => bulkCreate("Desk", 12, "Open floor")} disabled={busy} className="btn-outline text-sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add 12 desks
          </button>
        )}
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New desk</button>
      </div>

      {initial.length === 0 ? (
        <div className="card p-12 text-center">
          <Armchair className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No desks yet</h3>
        </div>
      ) : (
        <ul className="space-y-2">
          {initial.map(d => (
            <li key={d.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                <Armchair className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{d.name} {d.zone && <span className="text-ink-500 font-normal">· {d.zone}</span>}</div>
                <div className="text-[11px] text-ink-500 flex gap-2">
                  {d.hasMonitor && <span className="inline-flex items-center gap-0.5"><Monitor className="w-3 h-3" /> Monitor</span>}
                  {d.hasStanding && <span>· Standing</span>}
                  {!d.active && <span className="text-rose-600">· Inactive</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Armchair className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New desk</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Desk 14" />
              </div>
              <div>
                <label className="label">Zone</label>
                <input className="input" value={zone} onChange={(e) => setZone(e.target.value)} maxLength={80} placeholder="Engineering, Sales floor…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasMonitor} onChange={(e) => setHasMonitor(e.target.checked)} className="w-4 h-4" /> Monitor
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasStanding} onChange={(e) => setHasStanding(e.target.checked)} className="w-4 h-4" /> Standing
                </label>
              </div>
              <div>
                <label className="label">Location</label>
                <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
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
