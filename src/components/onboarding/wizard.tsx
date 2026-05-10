"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, ChevronRight, ChevronLeft, Loader2, ArrowRight } from "lucide-react";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";
import { Confetti } from "./confetti";

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
      {done && <Confetti trigger={done} />}

      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center shadow-soft">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight-2">Welcome, {userName.split(" ")[0]}!</h1>
        <p className="text-ink-500 dark:text-ink-400 mt-1">Let's get <b className="text-ink-900 dark:text-ink-100">{orgName}</b> set up in 60 seconds.</p>
      </header>

      <div className="flex items-center gap-2 max-w-sm mx-auto mb-8">
        {[1,2,3,4].map(n => (
          <div key={n} className="flex-1">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= n ? "bg-gradient-to-r from-brand-500 to-rose-500" : "bg-ink-200 dark:bg-ink-800"}`} />
            <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1.5 text-center transition ${step >= n ? "text-brand-600 dark:text-brand-400" : "text-ink-400 dark:text-ink-600"}`}>
              Step {n}
            </div>
          </div>
        ))}
      </div>

      <div key={step} className="animate-fade-up">
        {step === 1 && (
          <section className="card p-6">
            <h2 className="font-bold text-lg mb-1">What kind of business?</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">We'll pre-configure positions, shift blocks, and compliance defaults.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {INDUSTRY_TEMPLATES.map(t => (
                <button key={t.key} onClick={() => setIndustry(t.key)}
                  className={`text-left p-4 rounded-xl border-2 transition group ${industry === t.key ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-500/60" : "border-ink-200 dark:border-ink-800 hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-ink-50 dark:hover:bg-ink-800/40"}`}>
                  <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">{t.emoji}</div>
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && tpl && (
          <section className="card p-6">
            <h2 className="font-bold text-lg mb-1">Looks great. Here's what {tpl.label} comes with:</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">All editable later in <b>HR → Members</b> and the Schedule.</p>
            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider mb-1.5">Positions ({tpl.positions.length})</div>
                <div className="flex flex-wrap gap-1.5">{tpl.positions.map(p => <span key={p} className="badge-gray">{p}</span>)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider mb-1.5">Shift blocks</div>
                <div className="flex flex-wrap gap-1.5">{tpl.shiftBlocks.map(b => <span key={b.name} className="badge-orange">{b.name} {b.startTime}–{b.endTime}</span>)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider mb-1.5">Default geofence radius</div>
                <div className="text-sm font-semibold">{tpl.defaultGeofenceMeters}m around each site</div>
              </div>
              {tpl.recommendedComplianceTweaks && (
                <div>
                  <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider mb-1.5">Compliance presets</div>
                  <div className="text-sm">
                    {tpl.recommendedComplianceTweaks.mealBreakRequiredAfterHours && <>Meal break required after <b>{tpl.recommendedComplianceTweaks.mealBreakRequiredAfterHours}h</b>. </>}
                    {tpl.recommendedComplianceTweaks.predictiveSchedulingDays && <>Predictive scheduling: <b>{tpl.recommendedComplianceTweaks.predictiveSchedulingDays}</b> days notice.</>}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="card p-6">
            <h2 className="font-bold text-lg mb-1">Add your first location</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">You can add coordinates and more sites in Settings later.</p>
            <label className="label">Location name</label>
            <input className="input text-base" placeholder='e.g. "Main Street Store"' value={firstLocation} onChange={(e) => setFirstLocation(e.target.value)} autoFocus />
            <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-2">Skip to add later — you can finish setup either way.</div>
          </section>
        )}

        {step === 4 && done && (
          <section className="card p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 gradient-mesh opacity-50 pointer-events-none" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-soft animate-scale-in">
                <Check className="w-9 h-9" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight-2">You're all set! 🎉</h2>
              <p className="text-sm text-ink-600 dark:text-ink-300 mt-2 max-w-md mx-auto">
                Your workspace is ready. Try the <b>AI Co-pilot</b> (⌘K) to schedule shifts, or invite your team from <b>HR → Members</b>.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-2 max-w-md mx-auto">
                <QuickAction href="/schedule"   emoji="📅" label="Build your week" />
                <QuickAction href="/hr/members" emoji="👥" label="Invite your team" />
                <QuickAction href="/dashboard"  emoji="🚀" label="Open dashboard" primary />
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="flex items-center justify-between mt-6">
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

function QuickAction({ href, emoji, label, primary }: { href: string; emoji: string; label: string; primary?: boolean }) {
  return (
    <a href={href} className={`block p-3 rounded-xl border transition ${primary ? "bg-ink-900 dark:bg-brand-500 text-white border-transparent hover:scale-[1.02]" : "border-ink-200 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800"}`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-[11px] font-semibold flex items-center justify-center gap-1">{label} <ArrowRight className="w-3 h-3" /></div>
    </a>
  );
}
