"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QrCode, Loader2, CheckCircle2, AlertTriangle, MapPin } from "lucide-react";

export function ScanForm({ initialToken }: { initialToken: string }) {
  const r = useRouter();
  const [token, setToken] = useState(initialToken);
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsErr, setCoordsErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; postName?: string; locationName?: string; withinGeofence?: boolean | null; error?: string } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => setCoordsErr(err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setCoordsErr("Location not supported");
    }
  }, []);

  // Auto-submit if we have a token from QR scan + location
  useEffect(() => {
    if (initialToken && coords) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  async function submit() {
    if (!token.trim()) return;
    setBusy(true); setResult(null);
    const res = await fetch("/api/checkpoints/scan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qrToken: token.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    setResult({ ok: res.ok && data.ok, ...data });
    if (res.ok) {
      setNotes("");
      r.refresh();
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <label className="label">Checkpoint token</label>
        <input className="input font-mono text-sm" value={token} onChange={(e) => setToken(e.target.value)} placeholder="paste here if camera scan failed" autoFocus />
      </div>
      <div>
        <label className="label">Notes (optional)</label>
        <textarea className="input min-h-[68px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to flag? Found door unlocked, lights off, etc." />
      </div>
      <div className="text-[11px] text-ink-500 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5" />
        {coords ? <>GPS {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</> : coordsErr ? <span className="text-amber-700">{coordsErr} — scan still works but won&apos;t verify geofence</span> : <span>Getting GPS…</span>}
      </div>
      <button onClick={submit} disabled={busy || !token.trim()} className="btn-primary w-full">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
        Record scan
      </button>
      {result?.ok && (
        <div className={`rounded-xl border p-3 ${result.withinGeofence === false ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
          <div className="flex items-center gap-2 font-semibold text-sm">
            {result.withinGeofence === false
              ? <><AlertTriangle className="w-4 h-4 text-amber-700" /> <span className="text-amber-900">Scan recorded — but outside geofence</span></>
              : <><CheckCircle2 className="w-4 h-4 text-emerald-700" /> <span className="text-emerald-900">Scan recorded</span></>}
          </div>
          <div className="text-xs text-ink-700 mt-1">{result.postName} · {result.locationName}</div>
        </div>
      )}
      {result && !result.ok && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
          {result.error ?? "Scan failed"}
        </div>
      )}
    </div>
  );
}
