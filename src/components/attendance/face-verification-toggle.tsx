"use client";
import { useEffect, useState } from "react";
import { ScanFace, Loader2, Check } from "lucide-react";

type Mode = "off" | "flag" | "block";

const OPTIONS: { value: Mode; label: string; desc: string }[] = [
  { value: "off",   label: "Off",   desc: "No face check at clock-in." },
  { value: "flag",  label: "Flag",  desc: "Compare + record mismatches for review — punch still goes through." },
  { value: "block", label: "Block", desc: "Reject a clock-in when the face doesn't match." },
];

/** Owner control for the org's clock-in face-verification policy. ADMIN only. */
export function FaceVerificationToggle() {
  const [mode, setMode] = useState<Mode>("off");
  const [loaded, setLoaded] = useState(false);
  const [savingTo, setSavingTo] = useState<Mode | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/me/face/enroll")
      .then((r) => r.json())
      .then((d) => setMode((d.mode ?? "off") as Mode))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function pick(next: Mode) {
    if (next === mode || savingTo) return;
    setSavingTo(next);
    const res = await fetch("/api/org/face-verification", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    setSavingTo(null);
    if (res.ok) { setMode(next); setSavedAt(Date.now()); setTimeout(() => setSavedAt(null), 2000); }
  }

  if (!loaded) return null;

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <ScanFace className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold">Face verification policy</h3>
        {savedAt && <span className="text-[11px] text-emerald-400 ml-auto inline-flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
      </div>
      <p className="text-[12.5px] text-ink-400 mb-3">
        Match each clock-in selfie to the employee&rsquo;s enrolled face print. Start with <b>Flag</b> to
        validate accuracy before switching to <b>Block</b>.
      </p>
      <div className="grid sm:grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const active = mode === o.value;
          return (
            <button
              key={o.value}
              onClick={() => pick(o.value)}
              disabled={!!savingTo}
              className={`text-left rounded-xl border p-3 transition ${
                active ? "border-brand-500/50 bg-brand-500/10" : "border-white/[0.08] hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {savingTo === o.value ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {o.label}
                {active && savingTo !== o.value && <Check className="w-3.5 h-3.5 text-brand-300" />}
              </div>
              <div className="text-[11px] text-ink-500 mt-1">{o.desc}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
