"use client";
import { useEffect, useRef, useState } from "react";
import { ScanFace, Camera, Check, Loader2, ShieldCheck, Trash2, AlertTriangle } from "lucide-react";
import { computeFaceDescriptor } from "@/lib/face/client";

type Mode = "off" | "flag" | "block";

/**
 * Self-service Face ID enrollment. Computes a face print ON THIS DEVICE and
 * sends only the 128 numbers (never the photo) to the server, with explicit
 * consent. Renders nothing unless the org has face verification on (or the
 * member is already enrolled, so they can review/remove it).
 */
export function FaceEnrollment() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("off");
  const [enrolled, setEnrolled] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/face/enroll")
      .then((r) => r.json())
      .then((d) => { setMode((d.mode ?? "off") as Mode); setEnrolled(!!d.enrolled); })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCamOn(true);
      // attach after render
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 30);
    } catch {
      setError("Camera permission denied. Allow the camera to set up Face ID.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  async function enroll() {
    if (!videoRef.current || !consent) return;
    setBusy(true); setError(null);
    const result = await computeFaceDescriptor(videoRef.current);
    if (!result.ok) {
      setBusy(false);
      setError(result.reason === "no_face"
        ? "No face detected — center your face in the frame and try again."
        : "Couldn't load the face model. Check your connection and retry.");
      return;
    }
    const res = await fetch("/api/me/face/enroll", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptor: result.descriptor, consent: true }),
    });
    setBusy(false);
    if (!res.ok) { setError("Enrollment failed. Please try again."); return; }
    stopCamera();
    setEnrolled(true);
    setConsent(false);
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/me/face/enroll", { method: "DELETE" }).catch(() => {});
    setBusy(false);
    setEnrolled(false);
  }

  // Hide entirely when the feature is off and the member isn't enrolled.
  if (!loaded || (mode === "off" && !enrolled)) return null;

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <ScanFace className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold">Face ID for clock-in</h3>
        {enrolled && <span className="status status-success ml-1">Active</span>}
        {mode === "block" && <span className="status status-mute ml-auto">Required</span>}
      </div>

      {enrolled ? (
        <div className="mt-2">
          <p className="text-[13px] text-ink-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Your face print is enrolled. Clock-ins are matched to it.
          </p>
          <button onClick={remove} disabled={busy} className="btn-outline text-xs mt-3 border-rose-300/40 text-rose-300 hover:bg-rose-500/10">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Remove my face print
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-[13px] text-ink-400">
            Set up Face ID so the system confirms it&rsquo;s really you at clock-in. We store a math
            &ldquo;face print&rdquo; computed on your device — <b>not</b> a photo — and never share it.
          </p>

          {camOn && (
            <div className="relative aspect-square max-w-[260px] mt-3 rounded-xl overflow-hidden bg-ink-900">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          )}

          {error && (
            <div className="mt-3 text-[12px] text-amber-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {error}</div>
          )}

          {!camOn ? (
            <button onClick={startCamera} className="btn-primary text-sm mt-3"><Camera className="w-4 h-4" /> Set up Face ID</button>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="flex items-start gap-2 text-[12.5px] text-ink-300 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 rounded" />
                <span>I consent to ShyftForce creating and storing a biometric face print of me for clock-in verification. I can remove it any time.</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={enroll} disabled={busy || !consent} className="btn-primary text-sm">
                  {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Enrolling…</> : <><Check className="w-4 h-4" /> Capture &amp; enroll</>}
                </button>
                <button onClick={stopCamera} className="btn-ghost text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
