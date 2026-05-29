"use client";
import { useEffect, useState } from "react";
import { ScanFace, Loader2, Check, AlertTriangle } from "lucide-react";

type Mode = "off" | "flag" | "block";

const OPTIONS: { value: Mode; label: string; desc: string }[] = [
  { value: "off",   label: "Off",   desc: "No face check at clock-in." },
  { value: "flag",  label: "Flag",  desc: "Compare + record mismatches for review — punch still goes through." },
  { value: "block", label: "Block", desc: "Reject a clock-in when the face doesn't match." },
];

/** Owner control for the org's clock-in face-verification policy. ADMIN only. */
export function FaceVerificationToggle() {
  const [mode, setMode] = useState<Mode>("off");
  const [activeMembers, setActiveMembers] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [savingTo, setSavingTo] = useState<Mode | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pendingBlock, setPendingBlock] = useState(false);

  async function refresh() {
    const res = await fetch("/api/org/face-verification");
    if (!res.ok) return;
    const d = await res.json();
    setMode(d.mode ?? "off");
    setActiveMembers(d.activeMembers ?? 0);
    setEnrolledCount(d.enrolledCount ?? 0);
  }

  useEffect(() => {
    refresh().finally(() => setLoaded(true));
  }, []);

  async function commit(next: Mode) {
    setSavingTo(next);
    const res = await fetch("/api/org/face-verification", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    setSavingTo(null);
    if (res.ok) { setMode(next); setSavedAt(Date.now()); setTimeout(() => setSavedAt(null), 2000); }
  }

  async function pick(next: Mode) {
    if (next === mode || savingTo) return;
    // Guardrail: switching to Block when not everyone is enrolled would lock
    // unenrolled members out of clocking in. Always confirm.
    if (next === "block") { setPendingBlock(true); return; }
    await commit(next);
  }

  if (!loaded) return null;

  const unenrolled = Math.max(0, activeMembers - enrolledCount);

  return (
    <>
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
        <div className="text-[11px] text-ink-500 mb-3">
          <b className="text-ink-300">{enrolledCount}</b> of <b className="text-ink-300">{activeMembers}</b> active members enrolled.
          {unenrolled > 0 && mode !== "block" && <span className="text-amber-400 ml-1">· {unenrolled} not enrolled yet.</span>}
        </div>
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

      {/* Guardrail confirm — shows the LIVE impact of switching to Block. */}
      {pendingBlock && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ink-900 border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">
            <header className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-ink-50">Switch to Block mode?</h2>
            </header>
            <div className="px-5 py-4 space-y-3 text-[13.5px] text-ink-300">
              <p>
                In <b>Block</b> mode the server rejects any clock-in whose face doesn&rsquo;t match the
                enrolled print.
              </p>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 text-[12.5px] text-amber-200">
                <b>{enrolledCount}</b> of <b>{activeMembers}</b> active members are enrolled.
                {unenrolled > 0 ? (
                  <> The other <b>{unenrolled}</b> will be <b>unable to clock in</b> until they finish enrollment.</>
                ) : (
                  <> Everyone&rsquo;s enrolled — you&rsquo;re good to go.</>
                )}
              </div>
              <p className="text-[12px] text-ink-400">
                Consider running <b>Flag</b> mode first for a week so you can review mismatches without
                stopping payroll-impacting clock-ins.
              </p>
            </div>
            <footer className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button onClick={() => setPendingBlock(false)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={async () => { setPendingBlock(false); await commit("block"); }}
                className="btn-primary text-sm bg-amber-500 hover:bg-amber-600"
              >
                Yes, switch to Block
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
