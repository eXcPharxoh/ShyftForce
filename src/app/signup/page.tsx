"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

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
      // Auto-sign in after successful signup
      await signIn("credentials", { email, password, redirect: false });
      r.push("/onboarding");
    } catch (e: any) { setError(e.message ?? "Network error"); setLoading(false); }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-rose-500 text-white p-16">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center font-bold text-2xl">⚡</div>
            <div className="text-2xl font-bold tracking-tight">shyftforce</div>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-3">Start your 14-day trial.</h1>
          <p className="text-white/80 text-lg leading-relaxed">No credit card required. Set up your team in under 5 minutes.</p>
          <ul className="mt-10 space-y-3 text-white/90">
            {[
              "AI Co-pilot — schedule, report, message in plain English",
              "Auto-Scheduler — full week generated from your rules",
              "Compliance Autopilot — OT, breaks, Fair Workweek",
              "Geofenced clock-in with selfie verification",
              "Smart open-shift marketplace",
            ].map(f => <li key={f} className="flex gap-2"><span>✓</span><span>{f}</span></li>)}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm card p-8">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold">⚡</div>
            <div className="text-lg font-bold">shyftforce</div>
          </div>
          <h2 className="text-2xl font-bold mb-1">Create your workspace</h2>
          <p className="text-ink-500 text-sm mb-6">Free 14-day trial · no credit card.</p>
          <label className="label">Your name</label>
          <input className="input mb-3" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          <label className="label">Work email</label>
          <input className="input mb-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
          <label className="label">Company / workspace name</label>
          <input className="input mb-3" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Security" />
          <label className="label">Password (8+ characters)</label>
          <input className="input mb-4" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="text-rose-600 text-sm mb-3">{error}</div>}
          <button className="btn-primary w-full py-2.5" disabled={loading}>{loading ? "Creating…" : "Start free trial"}</button>
          <div className="text-center mt-4 text-xs text-ink-500">
            Already have an account? <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link>
          </div>
          <div className="text-center mt-2 text-[11px] text-ink-400">
            By signing up you agree to our <Link href="/legal/terms" className="hover:underline">Terms</Link> and <Link href="/legal/privacy" className="hover:underline">Privacy Policy</Link>.
          </div>
        </form>
      </div>
    </main>
  );
}
