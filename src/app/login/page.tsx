"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, Wordmark } from "@/components/ui/logo";
import { Sparkles, ShieldCheck, Zap, Workflow } from "lucide-react";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("admin@platinum.com");
  const [password, setPassword] = useState("password");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setErr("Invalid credentials");
    else r.push("/dashboard");
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-ink-50">
      {/* Marketing strip */}
      <div className="hidden lg:flex items-center justify-center p-16 relative overflow-hidden
                      bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 text-white">
        {/* Mesh + grid bg */}
        <div className="absolute inset-0 gradient-mesh opacity-90" />
        <div className="absolute inset-0 bg-grid-faint bg-[length:32px_32px] opacity-25" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-rose-500/30 blur-3xl" />

        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2.5 mb-10">
            <Logo size="lg" />
            <Wordmark className="text-2xl text-white" />
          </div>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight-2 mb-4">
            Workforce that<br/>
            <span className="text-gradient-brand">runs itself.</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-md">
            AI-powered scheduling, real-time attendance, payroll, time-off, expenses, HR — across every site, in one place.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Sparkles,    title: "AI Co-pilot",          desc: "Plain-English commands" },
              { icon: Workflow,    title: "Auto-Scheduler",       desc: "Full week from rules" },
              { icon: ShieldCheck, title: "Compliance",           desc: "OT, breaks, Fair Workweek" },
              { icon: Zap,         title: "Open-Shift Marketplace", desc: "30-50% fewer no-shows" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur p-4 hover:bg-white/[0.10] transition">
                <Icon className="w-5 h-5 text-brand-300 mb-2" />
                <div className="font-semibold text-sm">{title}</div>
                <div className="text-[11px] text-white/60 mt-0.5">{desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-4 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> SOC 2 in progress</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> 99.9% uptime</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> GDPR-ready</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm card p-8 animate-fade-up">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <Logo size="sm" />
            <Wordmark className="text-lg" />
          </div>
          <h2 className="text-[26px] font-bold tracking-tight-2 mb-1">Welcome back</h2>
          <p className="text-ink-500 text-sm mb-6">Sign in to your workspace.</p>

          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input mb-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input mb-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-[11px] text-brand-600 hover:underline">Forgot password?</Link>
          </div>

          {err && <div className="text-rose-600 text-xs mt-2 mb-2">{err}</div>}

          <button className="btn-primary w-full py-2.5 mt-4" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-center text-[11px] text-ink-500 mt-4">
            Don't have an account? <Link href="/signup" className="text-brand-600 font-semibold hover:underline">Start free trial →</Link>
          </div>

          <div className="mt-6 pt-5 border-t border-ink-100">
            <div className="text-[10px] uppercase font-bold tracking-wider text-ink-400 mb-2">Demo accounts</div>
            <div className="space-y-1 text-[11px]">
              <DemoRow email="admin@platinum.com"  badge="Admin"     tone="orange" />
              <DemoRow email="sarah@platinum.com"  badge="Manager"   tone="blue" />
              <DemoRow email="jordan@platinum.com" badge="Employee"  tone="gray" />
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

function DemoRow({ email, badge, tone }: { email: string; badge: string; tone: "orange" | "blue" | "gray" }) {
  const cls = tone === "orange" ? "badge-orange" : tone === "blue" ? "badge-blue" : "badge-gray";
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-ink-700">{email}</span>
      <span className={cls}>{badge}</span>
    </div>
  );
}
