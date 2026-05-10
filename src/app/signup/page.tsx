"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Logo, Wordmark } from "@/components/ui/logo";
import { Check, Sparkles } from "lucide-react";

export default function SignupPage() {
  const r = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, orgName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Sign up failed"); setLoading(false); return; }
      await signIn("credentials", { email, password, redirect: false });
      r.push("/onboarding");
    } catch (e: any) { setError(e.message ?? "Network error"); setLoading(false); }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-ink-50">
      {/* Marketing strip */}
      <div className="hidden lg:flex items-center justify-center p-16 relative overflow-hidden
                      bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 text-white">
        <div className="absolute inset-0 gradient-mesh opacity-90" />
        <div className="absolute inset-0 bg-grid-faint bg-[length:32px_32px] opacity-25" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-rose-500/30 blur-3xl" />

        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2.5 mb-10">
            <Logo size="lg" />
            <Wordmark className="text-2xl text-white" />
          </div>

          <div className="badge bg-brand-500/20 text-brand-200 ring-brand-300/30 mb-4">
            <Sparkles className="w-3 h-3" /> 14-day free trial · no credit card
          </div>

          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight-2 mb-4">
            Set up your team in<br/>
            <span className="text-gradient-brand">under 5 minutes.</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-md">
            Sign up, pick an industry template, invite your team. The AI Co-pilot will handle the rest.
          </p>

          <ul className="space-y-2.5">
            {[
              "AI Co-pilot — schedule, report, message in plain English",
              "Auto-Scheduler — full week generated from your rules",
              "Compliance Autopilot — OT, breaks, Fair Workweek",
              "Geofenced + photo clock-in — proof-of-presence",
              "Smart open-shift marketplace — auto-offer waves",
              "Stripe billing · Audit log · Team invitations",
            ].map(f => (
              <li key={f} className="flex gap-2.5 text-white/90">
                <span className="w-5 h-5 rounded-full bg-brand-500/25 ring-1 ring-brand-400/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-brand-200" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm card p-8 animate-fade-up">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <Logo size="sm" />
            <Wordmark className="text-lg" />
          </div>
          <h2 className="text-[26px] font-bold tracking-tight-2 mb-1">Create your workspace</h2>
          <p className="text-ink-500 dark:text-ink-400 text-sm mb-5">Free 14-day trial. Cancel anytime.</p>

          <label className="label" htmlFor="name">Your name</label>
          <input id="name" className="input mb-3" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoComplete="name" />

          <label className="label" htmlFor="email">Work email</label>
          <input id="email" className="input mb-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" autoComplete="email" />

          <label className="label" htmlFor="org">Company / workspace name</label>
          <input id="org" className="input mb-3" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Security" />

          <label className="label" htmlFor="password">Password (8+ characters)</label>
          <input id="password" className="input mb-4" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />

          {error && <div className="text-rose-600 text-xs mb-3">{error}</div>}
          <button className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? "Creating workspace…" : "Start free trial"}
          </button>

          <div className="text-center mt-4 text-xs text-ink-500 dark:text-ink-400">
            Already have an account? <Link href="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </div>
          <div className="text-center mt-2 text-[11px] text-ink-400 dark:text-ink-500">
            By signing up you agree to our <Link href="/legal/terms" className="hover:underline">Terms</Link> and <Link href="/legal/privacy" className="hover:underline">Privacy Policy</Link>.
          </div>
        </form>
      </div>
    </main>
  );
}
