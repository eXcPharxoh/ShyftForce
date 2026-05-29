"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Check, ChevronRight, ChevronLeft, Loader2, ArrowRight, Phone, ScanFace, Calendar, Clock, MessageSquare, Smartphone,
} from "lucide-react";
import { FaceEnrollment } from "@/components/attendance/face-enrollment";

/**
 * Employee first-time onboarding. Fires once when a freshly-invited team member
 * signs in (the (app) layout redirects them to /welcome until they finish).
 *
 * Keep it short — they're employees, not admins. 60 seconds tops:
 *   1. Welcome
 *   2. Phone (so the org can text them shift offers)
 *   3. Face ID (only if their org has face verification enabled)
 *   4. Quick tour → done
 */
export function EmployeeWizard({
  orgName, userName, faceMode,
}: {
  orgName: string;
  userName: string;
  faceMode: "off" | "flag" | "block";
}) {
  const r = useRouter();
  const showFace = faceMode !== "off";
  const totalSteps = showFace ? 4 : 3;

  const [step, setStep] = useState<number>(1);
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/me/onboarding/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() || null, smsOptIn }),
      });
      if (!res.ok) throw new Error("Failed to save");
      // Land them on the schedule — the most useful page for an employee.
      r.push("/schedule");
      r.refresh();
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
      setSaving(false);
    }
  }

  const stepKind: "welcome" | "phone" | "face" | "tour" =
    step === 1 ? "welcome" :
    step === 2 ? "phone" :
    step === 3 && showFace ? "face" :
    "tour";

  return (
    <div className="max-w-xl mx-auto">
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center shadow-soft">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight-2">Welcome, {userName.split(" ")[0]}!</h1>
        <p className="text-ink-400 mt-1">Let&rsquo;s get you set up at <b className="text-ink-100">{orgName}</b>. About 60 seconds.</p>
      </header>

      <div className="flex items-center gap-2 max-w-xs mx-auto mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
          <div key={n} className="flex-1">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= n ? "bg-gradient-to-r from-brand-500 to-rose-500" : "bg-white/[0.1]"}`} />
          </div>
        ))}
      </div>

      <div key={step} className="animate-fade-up">
        {stepKind === "welcome" && (
          <section className="card p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7" />
            </div>
            <h2 className="font-bold text-xl mb-2">You&rsquo;re on the team.</h2>
            <p className="text-sm text-ink-400 max-w-sm mx-auto">
              {orgName} uses ShyftForce to schedule shifts, track time, and message the team. Three quick things and you&rsquo;re in.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-6 text-center">
              <Mini icon={Calendar} label="See your schedule" />
              <Mini icon={Clock} label="Clock in / out" />
              <Mini icon={MessageSquare} label="Chat with team" />
            </div>
          </section>
        )}

        {stepKind === "phone" && (
          <section className="card p-6">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-4 h-4 text-brand-400" />
              <h2 className="font-bold text-lg">Your phone number</h2>
            </div>
            <p className="text-sm text-ink-400 mb-5">
              We&rsquo;ll text you when a shift opens up that fits you, or when your schedule changes. <b>You can opt out anytime.</b>
            </p>
            <label className="label">Mobile number</label>
            <input
              type="tel"
              className="input text-base"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
            <label className="flex items-start gap-2 text-[13px] text-ink-300 cursor-pointer mt-3">
              <input
                type="checkbox"
                className="mt-0.5 rounded"
                checked={smsOptIn}
                onChange={(e) => setSmsOptIn(e.target.checked)}
              />
              <span>Send me SMS for shift offers, swaps, and schedule changes. Standard rates apply.</span>
            </label>
            <p className="text-[11px] text-ink-500 mt-3">
              You can skip — your manager can still assign you shifts, you just won&rsquo;t get a text.
            </p>
          </section>
        )}

        {stepKind === "face" && (
          <section>
            <div className="card p-6 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <ScanFace className="w-4 h-4 text-brand-400" />
                <h2 className="font-bold text-lg">Set up Face ID for clock-in</h2>
              </div>
              <p className="text-sm text-ink-400">
                {orgName} verifies who&rsquo;s clocking in — so a coworker can&rsquo;t do it for you (or vice versa).
                Your face is processed <b>on this device</b>; only a math fingerprint (not a photo) leaves your phone.
              </p>
            </div>
            <FaceEnrollment />
            {faceMode === "block" && (
              <p className="text-[11px] text-amber-400 mt-3 text-center">
                Required at this workplace — you won&rsquo;t be able to clock in without enrolling.
              </p>
            )}
          </section>
        )}

        {stepKind === "tour" && (
          <section className="card p-6">
            <h2 className="font-bold text-lg mb-1">A quick tour, then we&rsquo;re done</h2>
            <p className="text-sm text-ink-400 mb-4">Here are the four things you&rsquo;ll use most:</p>
            <ul className="space-y-2.5">
              <TourRow icon={Calendar} title="Your schedule" body="See your upcoming shifts at a glance. Tap one for details." />
              <TourRow icon={Clock} title="Clock in / out" body="The big blue Clock button at the top. GPS + a quick selfie make it official." />
              <TourRow icon={Smartphone} title="Install the app" body="Add ShyftForce to your home screen so clocking in is one tap." />
              <TourRow icon={MessageSquare} title="Messages" body="Talk to your manager + teammates without leaving the app." />
            </ul>
            {error && <div className="text-rose-300 text-xs mt-3">{error}</div>}
          </section>
        )}
      </div>

      <footer className="flex items-center justify-between mt-6">
        {step > 1 ? (
          <button onClick={() => setStep((s) => s - 1)} className="btn-ghost"><ChevronLeft className="w-4 h-4" /> Back</button>
        ) : <div />}
        {step < totalSteps ? (
          <button onClick={() => setStep((s) => s + 1)} className="btn-primary ml-auto">Next <ChevronRight className="w-4 h-4" /></button>
        ) : (
          <button onClick={finish} disabled={saving} className="btn-primary ml-auto">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>I&rsquo;m all set <Check className="w-4 h-4" /></>}
          </button>
        )}
      </footer>
    </div>
  );
}

function Mini({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
      <Icon className="w-4 h-4 text-brand-300 mx-auto mb-1" />
      <div className="text-[11px] text-ink-300">{label}</div>
    </div>
  );
}

function TourRow({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-sm font-medium text-ink-50">{title}</div>
        <div className="text-[12px] text-ink-400">{body}</div>
      </div>
    </li>
  );
}
