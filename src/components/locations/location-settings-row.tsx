"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Save, ExternalLink, Loader2 } from "lucide-react";

type Loc = { id: string; name: string; latitude: number | null; longitude: number | null; geofenceRadiusMeters: number };

export function LocationSettingsRow({ location }: { location: Loc }) {
  const r = useRouter();
  const [lat, setLat] = useState<string>(location.latitude?.toString() ?? "");
  const [lng, setLng] = useState<string>(location.longitude?.toString() ?? "");
  const [radius, setRadius] = useState<number>(location.geofenceRadiusMeters);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true); setSaved(false);
    const res = await fetch(`/api/locations/${location.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude:  lat.trim()  === "" ? null : parseFloat(lat),
        longitude: lng.trim() === "" ? null : parseFloat(lng),
        geofenceRadiusMeters: Math.max(10, radius),
      }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); r.refresh(); }
  }

  const hasCoords = lat.trim() !== "" && lng.trim() !== "";

  return (
    <li className="px-5 py-4 flex flex-col md:flex-row gap-4 md:items-end">
      <div className="md:w-44 shrink-0 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
        <div>
          <div className="font-semibold text-sm">{location.name}</div>
          {hasCoords && (
            <a className="text-[11px] text-brand-600 hover:underline flex items-center gap-0.5" target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${lat},${lng}`}>
              view on map <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
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
      <button onClick={save} disabled={saving} className="btn-primary h-9 shrink-0">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? "Saved!" : saving ? "Saving" : "Save"}
      </button>
    </li>
  );
}
