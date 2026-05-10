"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";

export function OnboardingWizard({ orgName, userName }: { orgName: string; userName: string }) {
  const r = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [industry, setIndustry] = useState<string | null>(null);
  const [firstLocation, setFirstLocation] = useState("");
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  async function applyTemplate() {
    if (!industry) return;
    setApplying(true);
    await fetch("/api/onboarding/apply-template", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry, firstLocation: firstLocation.trim() ? { name: firstLocation.trim() } : undefined }),
    });
    setApplying(false);
    setDone(true);
    setStep(4);
  }

  const tpl = INDUSTRY_TEMPLATES.find(t => t.key === industry);

  return (
    <div className="max-w-2xl mx-auto">
      <header className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {userName.split(" ")[0]}!</h1>
        <p className="text-ink-500 mt-1">Let's get <b>{orgName}</b> set up in 60 seconds.</p>
      </header>

      <div className="flex items-center gap-1.5 max-w-sm mx-auto mb-6">
        {[1,2,3,4].map(n => (
          <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? "bg-brand-500" : "bg-ink-200"}`} />
        ))}
      </div>

      {step === 1 && (
        <section className="card p-6">
          <h2 className="font-bold text-lg mb-1">What kind of business?</h2>
          <p className="text-sm text-ink-500 mb-4">We'll pre-configure positions, shift blocks, and compliance defaults.</p>
          <div className="grid grid-cols-2 gap-2.5">
            {INDUSTRY_TEMPLATES.map(t => (
              <button key={t.key} onClick={() => setIndustry(t.key)}
                className={`text-left p-4 rounded-xl border-2 transition ${industry === t.key ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-brand-300 hover:bg-ink-50"}`}>
                <div className="text-2xl mb-1">{t.emoji}</div>
                <div className="font-semibold text-sm">{t.label}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">{t.description}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && tpl && (
        <section className="card p-6">
          <h2 className="font-bold text-lg mb-1">Looks great. Here's what {tpl.label} comes with:</h2>
          <p className="text-sm text-ink-500 mb-4">All editable later in <b>HR → Members</b> and the Schedule.</p>
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase text-ink-500 font-medium mb-1">Positions ({tpl.positions.length})</div>
              <div className="flex flex-wrap gap-1.5">{tpl.positions.map(p => <span key={p} className="badge-gray">{p}</span>)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-ink-500 font-medium mb-1">Shift blocks</div>
              <div className="flex flex-wrap gap-1.5">{tpl.shiftBlocks.map(b => <span key={b.name} className="badge-orange">{b.name} {b.startTime}–{b.endTime}</span>)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-ink-500 font-medium mb-1">Default geofence radius</div>
              <div className="text-sm font-semibold">{tpl.defaultGeofenceMeters}m around each site</div>
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card p-6">
          <h2 className="font-bold text-lg mb-1">Add your first location</h2>
          <p className="text-sm text-ink-500 mb-4">You can add coordinates and more sites in Settings later.</p>
          <label className="label">Location name</label>
          <input className="input" placeholder='e.g. "Main Street Store"' value={firstLocation} onChange={(e) => setFirstLocation(e.target.value)} autoFocus />
          <div className="text-[11px] text-ink-500 mt-2">Skip to add later.</div>
        </section>
      )}

      {step === 4 && done && (
        <section className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8" /></div>
          <h2 className="font-bold text-lg">You're set up! 🎉</h2>
          <p className="text-sm text-ink-500 mt-2 max-w-sm mx-auto">
            Your workspace is ready. Try the <b>AI Co-pilot</b> (⌘K) to schedule shifts, or invite your team from <b>HR → Members</b>.
          </p>
          <button onClick={() => r.push("/dashboard")} className="btn-primary mt-5">Go to dashboard</button>
        </section>
      )}

      <footer className="flex items-center justify-between mt-5">
        {step > 1 && step < 4 ? (
          <button onClick={() => setStep((s) => (s - 1) as any)} className="btn-ghost"><ChevronLeft className="w-4 h-4" /> Back</button>
        ) : <div />}
        {step === 1 && <button onClick={() => setStep(2)} disabled={!industry} className="btn-primary ml-auto">Next <ChevronRight className="w-4 h-4" /></button>}
        {step === 2 && <button onClick={() => setStep(3)} className="btn-primary ml-auto">Looks good <ChevronRight className="w-4 h-4" /></button>}
        {step === 3 && (
          <button onClick={applyTemplate} disabled={applying} className="btn-primary ml-auto">
            {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</> : <>Finish setup <Check className="w-4 h-4" /></>}
          </button>
        )}
      </footer>
    </div>
  );
}
