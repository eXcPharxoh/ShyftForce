"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X, Building2 } from "lucide-react";

export function LocationCreateForm() {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState(100);
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(""); setLat(""); setLng(""); setRadius(100); setBudget("");
    setError(null); setBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/locations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        latitude: lat.trim() === "" ? null : parseFloat(lat),
        longitude: lng.trim() === "" ? null : parseFloat(lng),
        geofenceRadiusMeters: Math.max(10, radius),
        weeklyBudget: budget.trim() === "" ? null : parseFloat(budget),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setOpen(false); reset(); r.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add location
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-sm">New location</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Downtown store" required minLength={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Latitude</label>
                  <input className="input" type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="45.5088" />
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input className="input" type="number" step="0.000001" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-73.5878" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Geofence radius (m)</label>
                  <input className="input" type="number" min={10} max={5000} step={5} value={radius} onChange={(e) => setRadius(parseInt(e.target.value, 10) || 100)} />
                </div>
                <div>
                  <label className="label">Weekly budget ($)</label>
                  <input className="input" type="number" min={0} step={50} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="optional" />
                </div>
              </div>
              <p className="text-[11px] text-ink-500">Tip: open Google Maps → right-click your site → click the lat/lng to copy.</p>
              {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 border border-rose-200 dark:border-rose-500/30">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || name.trim().length < 2} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {busy ? "Creating…" : "Add location"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
