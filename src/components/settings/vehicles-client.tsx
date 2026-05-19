"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Loader2, Plus, X, Trash2, Wrench, MapPin } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Vehicle = {
  id: string;
  name: string;
  locationId: string | null;
  locationName: string | null;
  licensePlate: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: string;
  notes: string | null;
  upcomingAssignments: { id: string; memberName: string; startsAt: string; endsAt: string }[];
};

const STATUS_TONE: Record<string, string> = {
  active:      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  maintenance: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  retired:     "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400",
};

export function VehiclesClient({ locations, initial }: { locations: { id: string; name: string }[]; initial: Vehicle[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [locId, setLocId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/vehicles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        licensePlate: licensePlate.trim() || null,
        make: make.trim() || null,
        model: model.trim() || null,
        year: year === "" ? null : Number(year),
        locationId: locId || null,
        notes: notes.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); r.refresh();
  }

  async function setStatus(v: Vehicle, status: "active" | "maintenance" | "retired") {
    const res = await fetch(`/api/vehicles/${v.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setItems(prev => prev.map(x => x.id === v.id ? { ...x, status } : x));
  }

  async function remove(v: Vehicle) {
    const ok = await confirm({ title: `Delete "${v.name}"?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/vehicles/${v.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== v.id));
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Add vehicle</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Truck className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No vehicles yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">Add your fleet to start assigning vehicles to shifts and tracking mileage.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(v => (
            <li key={v.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {v.name}
                    <span className={`ml-2 text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[v.status] ?? STATUS_TONE.active}`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    {[v.year, v.make, v.model].filter(Boolean).join(" ")}
                    {v.licensePlate && <span>· Plate: <b>{v.licensePlate}</b></span>}
                    {v.locationName && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {v.locationName}</span>}
                  </div>
                  {v.notes && <div className="text-[11px] text-ink-500 mt-0.5">{v.notes}</div>}
                </div>
                <div className="flex items-center gap-1">
                  {v.status === "active" ? (
                    <button onClick={() => setStatus(v, "maintenance")} className="btn-ghost text-amber-600 text-xs" title="Mark in maintenance">
                      <Wrench className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => setStatus(v, "active")} className="btn-ghost text-emerald-600 text-xs" title="Mark active">
                      ✓
                    </button>
                  )}
                  <button onClick={() => remove(v)} aria-label="Delete" className="btn-ghost text-rose-600 text-xs">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {v.upcomingAssignments.length > 0 && (
                <div className="mt-3 ml-13 pl-3 border-l-2 border-brand-200 dark:border-brand-500/30 space-y-0.5">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-500 mb-1">Upcoming</div>
                  {v.upcomingAssignments.map(a => (
                    <div key={a.id} className="text-[11px] text-ink-700 dark:text-ink-300">
                      <b>{a.memberName}</b> · {fmt(a.startsAt)} → {fmt(a.endsAt).split(", ")[1]}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Add vehicle</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Nickname *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Van 3, Truck 12, etc." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">License plate</label>
                  <input className="input" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} maxLength={20} />
                </div>
                <div>
                  <label className="label">Year</label>
                  <input className="input" type="number" min={1950} max={2100} value={year} onChange={(e) => setYear(e.target.value === "" ? "" : parseInt(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Make</label>
                  <input className="input" value={make} onChange={(e) => setMake(e.target.value)} maxLength={40} placeholder="Ford" />
                </div>
                <div>
                  <label className="label">Model</label>
                  <input className="input" value={model} onChange={(e) => setModel(e.target.value)} maxLength={40} placeholder="Transit 250" />
                </div>
              </div>
              <div>
                <label className="label">Home base (optional)</label>
                <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                  <option value="">No home base</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
