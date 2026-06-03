"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, ChevronRight, ChevronLeft, Loader2, ArrowRight, X, Plus } from "lucide-react";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";
import { Confetti } from "./confetti";

type ShiftBlock = { name: string; startTime: string; endTime: string };

export function OnboardingWizard({ orgName, userName }: { orgName: string; userName: string }) {
  const r = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [industry, setIndustry] = useState<string | null>(null);
  const [firstLocation, setFirstLocation] = useState("");
  const [firstLocationAddress, setFirstLocationAddress] = useState("");

  // Step-2 customization state. Seeded from the chosen industry template the
  // first time the user lands on Step 2, but every value below is theirs to
  // change — positions, shift blocks, geofence radius, and compliance thresholds.
  const [positions, setPositions] = useState<string[]>([]);
  const [newPosition, setNewPosition] = useState("");
  const [shiftBlocks, setShiftBlocks] = useState<ShiftBlock[]>([]);
  const [geofenceMeters, setGeofenceMeters] = useState<number>(50);
  const [mealBreakHours, setMealBreakHours] = useState<number>(5);
  const [predictiveSchedulingDays, setPredictiveSchedulingDays] = useState<number>(0);

  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  const tpl = INDUSTRY_TEMPLATES.find((t) => t.key === industry);

  // Re-seed defaults when the user picks (or changes) the industry. They can
  // still freely edit afterward — this just pulls in sensible starting values.
  useEffect(() => {
    if (!tpl) return;
    setPositions([...tpl.positions]);
    setShiftBlocks(tpl.shiftBlocks.map((b) => ({ ...b })));
    setGeofenceMeters(tpl.defaultGeofenceMeters);
    setMealBreakHours(tpl.recommendedComplianceTweaks?.mealBreakRequiredAfterHours ?? 5);
    setPredictiveSchedulingDays(tpl.recommendedComplianceTweaks?.predictiveSchedulingDays ?? 0);
  }, [industry]); // eslint-disable-line react-hooks/exhaustive-deps

  function addPosition() {
    const t = newPosition.trim();
    if (!t || positions.includes(t)) return;
    setPositions([...positions, t]);
    setNewPosition("");
  }
  function removePosition(p: string) {
    setPositions(positions.filter((x) => x !== p));
  }
  function addShiftBlock() {
    setShiftBlocks([...shiftBlocks, { name: "New block", startTime: "09:00", endTime: "17:00" }]);
  }
  function updateShiftBlock(i: number, patch: Partial<ShiftBlock>) {
    setShiftBlocks(shiftBlocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function removeShiftBlock(i: number) {
    setShiftBlocks(shiftBlocks.filter((_, idx) => idx !== i));
  }

  async function applyTemplate() {
    if (!industry) return;
    setApplying(true);
    await fetch("/api/onboarding/apply-template", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry,
        firstLocation: firstLocation.trim()
          ? { name: firstLocation.trim(), address: firstLocationAddress.trim() || undefined }
          : undefined,
        // User-customized values — the API uses these instead of the template
        // defaults if provided.
        positions,
        shiftBlocks,
        geofenceMeters,
        compliance: {
          mealBreakRequiredAfterHours: mealBreakHours,
          predictiveSchedulingDays: predictiveSchedulingDays || undefined,
        },
      }),
    });
    setApplying(false);
    setDone(true);
    setStep(4);
  }

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
        <p className="text-ink-500 dark:text-ink-400 mt-1">Let&rsquo;s get <b className="text-ink-900 dark:text-ink-100">{orgName}</b> set up in 60 seconds.</p>
      </header>

      {/* Conversational alternative — for users who'd rather describe their
          business in plain English than click through forms. Routes to the
          Co-pilot with a pre-filled setup prompt; the Co-pilot's tools can
          create locations, invite members, build the schedule, etc. */}
      <button
        onClick={() => {
          sessionStorage.setItem(
            "copilot:initialPrompt",
            `Help me set up my workspace. I'll describe my business and you ask me what you need to know — then create the locations, positions, shift templates, and initial schedule for me. Start by asking what kind of business I run.`
          );
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }));
        }}
        className="w-full mb-6 card p-4 hover:border-brand-500/40 transition flex items-center gap-3 text-left bg-gradient-to-r from-brand-500/[0.06] to-purple-500/[0.06] border-brand-500/25"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-soft">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-brand-400 mb-0.5">
            Faster way
          </div>
          <div className="font-semibold text-sm text-ink-900 dark:text-ink-100">
            Just talk to the assistant
          </div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            Describe your business in plain English. It&rsquo;ll ask what it needs to know and configure everything for you.
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-brand-400 shrink-0" />
      </button>

      <div className="flex items-center gap-2 max-w-sm mx-auto mb-8">
        {[1, 2, 3, 4].map((n) => (
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
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">We&rsquo;ll pre-configure positions, shift blocks, and compliance defaults — and you&rsquo;ll customize them next.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {INDUSTRY_TEMPLATES.map((t) => (
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
            <h2 className="font-bold text-lg mb-1">Make it yours</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">
              We pre-filled what most {tpl.label.toLowerCase()} use. <b>Tweak anything below</b> — add or remove items, change times, set your numbers. You can revisit these in Settings later too.
            </p>

            <div className="space-y-6">
              {/* POSITIONS */}
              <div>
                <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider mb-2">Positions <span className="text-ink-400 dark:text-ink-500">({positions.length})</span></div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {positions.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 rounded-full bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 pl-2.5 pr-1.5 py-1 text-[12px] font-medium">
                      {p}
                      <button onClick={() => removePosition(p)} className="rounded-full p-0.5 hover:bg-rose-500/15 hover:text-rose-500 transition" aria-label={`Remove ${p}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {positions.length === 0 && (
                    <span className="text-[12px] text-ink-400 dark:text-ink-500 italic">No positions yet — add one below.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1 text-sm py-1.5"
                    placeholder="Add a position (e.g. Barista)"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPosition(); } }}
                  />
                  <button onClick={addPosition} disabled={!newPosition.trim()} className="btn-ghost px-2 disabled:opacity-40" aria-label="Add position">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SHIFT BLOCKS */}
              <div>
                <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider mb-2">Shift blocks <span className="text-ink-400 dark:text-ink-500">({shiftBlocks.length})</span></div>
                <div className="space-y-1.5">
                  {shiftBlocks.map((b, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        className="input flex-1 text-sm py-1.5"
                        value={b.name}
                        onChange={(e) => updateShiftBlock(i, { name: e.target.value })}
                        placeholder="Block name"
                      />
                      <input
                        type="time"
                        className="input w-[112px] text-sm py-1.5"
                        value={b.startTime}
                        onChange={(e) => updateShiftBlock(i, { startTime: e.target.value })}
                      />
                      <span className="text-ink-400 text-xs">→</span>
                      <input
                        type="time"
                        className="input w-[112px] text-sm py-1.5"
                        value={b.endTime}
                        onChange={(e) => updateShiftBlock(i, { endTime: e.target.value })}
                      />
                      <button onClick={() => removeShiftBlock(i)} className="btn-ghost px-2 text-ink-400 hover:text-rose-500 hover:bg-rose-500/10" aria-label="Remove block">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={addShiftBlock} className="btn-ghost text-xs mt-2 inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add shift block
                </button>
              </div>

              {/* GEOFENCE */}
              <div>
                <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider mb-2">Default geofence radius</div>
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="number"
                    min={10} max={2000} step={5}
                    className="input w-[90px] text-sm py-1.5"
                    value={geofenceMeters}
                    onChange={(e) => setGeofenceMeters(Math.max(10, parseInt(e.target.value) || 50))}
                  />
                  <span className="text-ink-700 dark:text-ink-300">meters around each site</span>
                </div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">Clock-ins outside this radius are flagged or rejected.</div>
              </div>

              {/* COMPLIANCE */}
              <div>
                <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider mb-2">Compliance presets</div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="text-ink-700 dark:text-ink-300">Meal break required after</span>
                    <input
                      type="number"
                      min={0} max={24} step={0.5}
                      className="input w-[80px] text-sm py-1.5"
                      value={mealBreakHours}
                      onChange={(e) => setMealBreakHours(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-ink-700 dark:text-ink-300">hours</span>
                    <span className="text-[11px] text-ink-500 dark:text-ink-400">(0 = no rule)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="text-ink-700 dark:text-ink-300">Schedule notice (Fair Workweek)</span>
                    <input
                      type="number"
                      min={0} max={60} step={1}
                      className="input w-[80px] text-sm py-1.5"
                      value={predictiveSchedulingDays}
                      onChange={(e) => setPredictiveSchedulingDays(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-ink-700 dark:text-ink-300">days notice</span>
                    <span className="text-[11px] text-ink-500 dark:text-ink-400">(0 = off)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="card p-6">
            <h2 className="font-bold text-lg mb-1">Add your first location</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">
              Drop the address too — we&rsquo;ll geocode it so your geofence and live map work on day one.
              Skip the address and you can drop a pin later.
            </p>
            <label className="label">Location name</label>
            <input className="input text-base" placeholder='e.g. "Main Street Store"' value={firstLocation} onChange={(e) => setFirstLocation(e.target.value)} autoFocus />
            <label className="label mt-4">Address <span className="text-ink-400 dark:text-ink-500 font-normal">(optional)</span></label>
            <input
              className="input text-base"
              placeholder='e.g. "440 N Barranca Ave, Covina, CA"'
              value={firstLocationAddress}
              onChange={(e) => setFirstLocationAddress(e.target.value)}
            />
            <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-2">
              We use OpenStreetMap to look it up — nothing else leaves your workspace.
            </div>
          </section>
        )}

        {step === 4 && done && (
          <section className="card p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 gradient-mesh opacity-50 pointer-events-none" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-soft animate-scale-in">
                <Check className="w-9 h-9" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight-2">You&rsquo;re all set! 🎉</h2>
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
        {step === 2 && <button onClick={() => setStep(3)} className="btn-primary ml-auto">Save &amp; continue <ChevronRight className="w-4 h-4" /></button>}
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
