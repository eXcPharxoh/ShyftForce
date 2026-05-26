"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, MapPin, X, CheckCircle2, AlertTriangle, Loader2, Coffee, LogOut, Clock } from "lucide-react";
import { fmtDistance } from "@/lib/geo";

type Action = "clock_in" | "clock_out" | "break_start" | "break_end";

const ACTION_META: Record<Action, { label: string; icon: any; tone: string }> = {
  clock_in:    { label: "Clock In",    icon: Clock,   tone: "brand"   },
  clock_out:   { label: "Clock Out",   icon: LogOut,  tone: "rose"    },
  break_start: { label: "Start Break", icon: Coffee,  tone: "amber"   },
  break_end:   { label: "End Break",   icon: Clock,   tone: "emerald" },
};

export function ClockInDialog({
  open, onClose, action, memberId, assignedLocation,
}: {
  open: boolean;
  onClose: () => void;
  action: Action;
  memberId: string;
  assignedLocation?: { name: string; latitude: number | null; longitude: number | null; geofenceRadiusMeters: number } | null;
}) {
  const r = useRouter();
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Live distance estimate for UI feedback
  const distance = coords && assignedLocation?.latitude != null && assignedLocation?.longitude != null
    ? haversine(coords.lat, coords.lng, assignedLocation.latitude, assignedLocation.longitude)
    : null;
  const withinFence = distance != null && assignedLocation
    ? distance <= assignedLocation.geofenceRadiusMeters
    : null;

  // Mirror the server's anti-buddy-punch rules so the user sees what's needed
  // instead of getting a 422 after submitting.
  const hasGeofence = assignedLocation?.latitude != null && assignedLocation?.longitude != null;
  const needsPhoto = action === "clock_in";
  const needsOnSite = (action === "clock_in" || action === "clock_out") && hasGeofence;
  const blockReason =
    needsPhoto && !photoData        ? "Take a photo to continue" :
    needsOnSite && !coords          ? "Waiting for your location…" :
    needsOnSite && withinFence === false ? `You're outside the geofence — move within ${assignedLocation?.geofenceRadiusMeters}m of ${assignedLocation?.name} to continue` :
    null;

  // Boot camera + geolocation when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    // Geolocation
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (!cancelled) setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); },
        (err) => { if (!cancelled) setCoordsError(err.message ?? "GPS unavailable"); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      setCoordsError("Geolocation not supported");
    }

    // Camera
    (async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPhotoError("Camera not supported"); return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setPhotoError(e?.message ?? "Camera permission denied");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current; const c = canvasRef.current;
    const w = 320, h = 320;
    c.width = w; c.height = h;
    const ctx = c.getContext("2d"); if (!ctx) return;
    // Cover-fit
    const vAR = v.videoWidth / v.videoHeight;
    let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
    if (vAR > 1) { sw = v.videoHeight; sx = (v.videoWidth - sw) / 2; }
    else         { sh = v.videoWidth;  sy = (v.videoHeight - sh) / 2; }
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
    const data = c.toDataURL("image/jpeg", 0.7);
    setPhotoData(data);
  }

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/attendance/clock", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId, type: action,
        latitude: coords?.lat, longitude: coords?.lng, accuracyMeters: coords?.accuracy,
        photoData: photoData ?? undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    setResult({ ok: res.ok, ...data });
    if (res.ok) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      setTimeout(() => { onClose(); r.refresh(); }, 1400);
    }
  }

  const meta = ACTION_META[action];
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col text-ink-900 dark:text-ink-50 animate-scale-in">
        <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center gap-2.5 shrink-0">
          <div className={`w-8 h-8 rounded-lg bg-${meta.tone}-500 text-white flex items-center justify-center shadow-soft shrink-0`}>
            <meta.icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm leading-none">{meta.label}</div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">{assignedLocation?.name ?? "No assigned location"}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-5 space-y-4">
          {!result && (
            <>
              {/* Camera preview / photo */}
              <div className="relative aspect-square bg-ink-900 rounded-2xl overflow-hidden">
                {photoData ? (
                  <img src={photoData} alt="captured" className="w-full h-full object-cover" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}
                {photoError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink-900/85 text-white text-xs text-center p-4">
                    📷 {photoError}<br/><span className="opacity-60">You can clock in without a photo, but it will be marked unverified.</span>
                  </div>
                )}
                {!photoError && !photoData && (
                  <button onClick={capture} className="absolute inset-x-0 bottom-3 mx-auto w-12 h-12 rounded-full bg-white border-4 border-white/40 hover:scale-105 transition" aria-label="Capture" />
                )}
                {photoData && (
                  <button onClick={() => setPhotoData(null)} className="absolute top-2 right-2 px-2 py-1 rounded-md bg-ink-900/70 text-white text-[11px]">Retake</button>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />

              {/* Geofence status */}
              <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  withinFence === true  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
                  withinFence === false ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300"     :
                                          "bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-400"
                }`}><MapPin className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0 text-sm">
                  {coordsError && <div className="text-ink-700 dark:text-ink-300">Location unavailable<div className="text-[11px] text-ink-500 dark:text-ink-400">{coordsError}</div></div>}
                  {!coordsError && !coords && <div className="text-ink-500 dark:text-ink-400 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Getting your location…</div>}
                  {coords && distance == null && <div className="text-ink-700 dark:text-ink-300">Location captured · no geofence on this site</div>}
                  {coords && distance != null && (
                    <>
                      <div className={withinFence ? "text-emerald-700 dark:text-emerald-300 font-medium" : "text-amber-700 dark:text-amber-300 font-medium"}>
                        {withinFence ? "Within geofence" : "Outside geofence"} · {fmtDistance(distance)} from site
                      </div>
                      <div className="text-[11px] text-ink-500 dark:text-ink-400">Allowed: ≤ {assignedLocation?.geofenceRadiusMeters}m · accuracy ±{Math.round(coords.accuracy)}m</div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {result && (
            <div className="text-center py-4">
              {result.ok ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="font-semibold">{meta.label} recorded</div>
                  <div className="text-sm text-ink-500 dark:text-ink-400 mt-1">
                    {result.verified
                      ? "Verified · GPS + photo captured"
                      : "Recorded — but unverified (missing GPS or photo)"}
                    {result.distanceMeters != null && <> · {fmtDistance(result.distanceMeters)} from site</>}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="font-semibold">Couldn't record</div>
                  <div className="text-sm text-rose-600 dark:text-rose-400 mt-1">{result.error ?? "Try again"}</div>
                </>
              )}
            </div>
          )}
        </div>

        {!result && (
          <footer className="border-t border-ink-200 dark:border-ink-800 p-4 flex flex-col gap-2 shrink-0">
            {blockReason && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 text-center">{blockReason}</div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button onClick={submit} disabled={submitting || !!blockReason} className={`btn-primary bg-${meta.tone}-500 hover:bg-${meta.tone}-600`}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><meta.icon className="w-4 h-4" /> {meta.label}</>}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1); const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
