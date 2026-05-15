"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Save, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Loc = { id: string; name: string; latitude: number | null; longitude: number | null; geofenceRadiusMeters: number };

export function LocationSettingsRow({ location }: { location: Loc }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [name, setName] = useState(location.name);
  const [lat, setLat] = useState<string>(location.latitude?.toString() ?? "");
  const [lng, setLng] = useState<string>(location.longitude?.toString() ?? "");
  const [radius, setRadius] = useState<number>(location.geofenceRadiusMeters);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setSaved(false); setError(null);
    const res = await fetch(`/api/locations/${location.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || location.name,
        latitude:  lat.trim()  === "" ? null : parseFloat(lat),
        longitude: lng.trim() === "" ? null : parseFloat(lng),
        geofenceRadiusMeters: Math.max(10, radius),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
      return;
    }
    setSaved(true); setTimeout(() => setSaved(false), 1500); r.refresh();
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete "${location.name}"?`,
      description: "If any shifts still reference this location, the delete will be blocked. Reassign those shifts first.",
      tone: "danger",
      confirmLabel: "Delete location",
    });
    if (!ok) return;
    setDeleting(true); setError(null);
    const res = await fetch(`/api/locations/${location.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Delete failed");
      return;
    }
    r.refresh();
  }

  const hasCoords = lat.trim() !== "" && lng.trim() !== "";

  return (
    <li className="px-5 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
          <input className="input h-8 font-semibold text-sm" value={name} onChange={(e) => setName(e.target.value)} aria-label="Location name" />
          {hasCoords && (
            <a className="text-[11px] text-brand-600 hover:underline inline-flex items-center gap-0.5 mt-1" target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${lat},${lng}`}>
              view on map <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <button onClick={remove} disabled={deleting || saving} aria-label="Delete location" className="btn-ghost text-rose-600 dark:text-rose-400 text-xs">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="label">Latitude</label>
            <input className="input h-9" type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="45.5088" />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input className="input h-9" type="number" step="0.000001" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-73.5878" />
          </div>
          <div>
            <label className="label flex items-center gap-1"><MapPin className="w-3 h-3" /> Radius (m)</label>
            <input className="input h-9" type="number" min={10} max={5000} step={5} value={radius} onChange={(e) => setRadius(parseInt(e.target.value, 10) || 100)} />
          </div>
        </div>
        <button onClick={save} disabled={saving || deleting} className="btn-primary h-9 shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : saving ? "Saving" : "Save"}
        </button>
      </div>
      {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 border border-rose-200 dark:border-rose-500/30">{error}</div>}
    </li>
  );
}
