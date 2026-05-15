"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, Wordmark } from "@/components/ui/logo";
import { Sparkles, ShieldCheck, Zap, Workflow, Loader2, ArrowRight } from "lucide-react";

// Show the SSO buttons only if the server is configured for them.
// Each NEXT_PUBLIC_* flag is set when the corresponding provider's client ID exists.
const GOOGLE_ENABLED    = !!process.env.NEXT_PUBLIC_GOOGLE_LOGIN;
const MICROSOFT_ENABLED = !!process.env.NEXT_PUBLIC_MICROSOFT_LOGIN;

const DEMOS: { email: string; password: string; badge: string; tone: "orange" | "blue" | "gray"; sub: string }[] = [
  { email: "admin@platinum.com",  password: "password", badge: "Admin",    tone: "orange", sub: "Full org access" },
  { email: "sarah@platinum.com",  password: "password", badge: "Manager",  tone: "blue",   sub: "Sees only their location" },
  { email: "jordan@platinum.com", password: "password", badge: "Employee", tone: "gray",   sub: "Schedule + clock-in only" },
];

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("admin@platinum.com");
  const [password, setPassword] = useState("password");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  // 2FA state. Once the server tells us TOTP_REQUIRED, we show the code field
  // and reuse the same email/password on next submit.
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totp, setTotp]     = useState("");
  const [recovery, setRecovery] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr(null);
    const res = await signIn("credentials", {
      email, password,
      totp: needsTotp && !useRecovery ? totp : undefined,
      recoveryCode: needsTotp && useRecovery ? recovery : undefined,
      redirect: false,
    });
    setLoading(false);
    if (res?.error === "TOTP_REQUIRED") {
      setNeedsTotp(true);
      setErr(null);
      return;
    }
    if (res?.error) {
      setErr(needsTotp ? "Invalid 2FA code" : "Invalid credentials");
    } else {
      r.push("/dashboard");
    }
  }

  async function loginAsDemo(d: typeof DEMOS[number]) {
    setDemoLoading(d.email); setErr(null);
    const res = await signIn("credentials", { email: d.email, password: d.password, redirect: false });
    setDemoLoading(null);
    if (res?.error) {
      setErr(`Demo accounts not seeded yet on this database. Sign up at /signup to create your own org.`);
    } else {
      r.push("/dashboard");
    }
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
          <p className="text-ink-500 dark:text-ink-400 text-sm mb-6">Sign in to your workspace.</p>

          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input mb-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input mb-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-[11px] text-brand-600 hover:underline">Forgot password?</Link>
          </div>

          {needsTotp && (
            <div className="mt-4 rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/60 dark:bg-brand-500/10 p-3">
              <div className="text-xs font-semibold text-brand-900 dark:text-brand-200 mb-2">
                🔐 Two-factor authentication
              </div>
              {!useRecovery ? (
                <>
                  <label className="label">6-digit code from your authenticator app</label>
                  <input className="input" value={totp} onChange={(e) => setTotp(e.target.value)}
                    inputMode="numeric" maxLength={6} pattern="[0-9]{6}" autoComplete="one-time-code"
                    placeholder="000000" autoFocus required />
                  <button type="button" onClick={() => { setUseRecovery(true); setTotp(""); }} className="text-[11px] text-brand-600 hover:underline mt-2">
                    Use a recovery code instead
                  </button>
                </>
              ) : (
                <>
                  <label className="label">Recovery code (####-####)</label>
                  <input className="input" value={recovery} onChange={(e) => setRecovery(e.target.value)}
                    maxLength={9} pattern="[0-9]{4}-[0-9]{4}" placeholder="0000-0000" autoFocus required />
                  <button type="button" onClick={() => { setUseRecovery(false); setRecovery(""); }} className="text-[11px] text-brand-600 hover:underline mt-2">
                    Use an authenticator code instead
                  </button>
                </>
              )}
            </div>
          )}

          {err && <div className="text-rose-600 text-xs mt-2 mb-2">{err}</div>}

          <button className="btn-primary w-full py-2.5 mt-4" disabled={loading || !!demoLoading}>
            {loading ? "Signing in…" : needsTotp ? "Verify & sign in" : "Sign in"}
          </button>

          {(GOOGLE_ENABLED || MICROSOFT_ENABLED) && !needsTotp && (
            <>
              <div className="my-4 flex items-center gap-3 text-[11px] text-ink-400 dark:text-ink-500">
                <div className="flex-1 h-px bg-ink-200 dark:bg-ink-800" />
                <span>OR</span>
                <div className="flex-1 h-px bg-ink-200 dark:bg-ink-800" />
              </div>
              <div className="space-y-2">
                {GOOGLE_ENABLED && (
                  <button type="button" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 hover:bg-ink-50 dark:hover:bg-ink-800/60 text-sm font-medium transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.6c-.2 1.3-1 2.4-2 3.1v2.6h3.3c1.9-1.8 3.1-4.4 3.1-7.7Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6C4.7 19.7 8 22 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9c-.2-.6-.3-1.3-.3-2s.1-1.3.3-1.9V7.4H3a10 10 0 0 0 0 9.2l3.4-2.7Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 3 14.7 2 12 2 8 2 4.7 4.3 3 7.4l3.4 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>
                    Continue with Google
                  </button>
                )}
                {MICROSOFT_ENABLED && (
                  <button type="button" onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 hover:bg-ink-50 dark:hover:bg-ink-800/60 text-sm font-medium transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><rect width="10" height="10" x="2" y="2" fill="#F25022"/><rect width="10" height="10" x="12" y="2" fill="#7FBA00"/><rect width="10" height="10" x="2" y="12" fill="#00A4EF"/><rect width="10" height="10" x="12" y="12" fill="#FFB900"/></svg>
                    Continue with Microsoft
                  </button>
                )}
              </div>
              <p className="text-[10px] text-ink-500 dark:text-ink-400 text-center mt-2">
                Your account must already exist (your admin invites you first). Accounts with 2FA enabled must use password sign-in.
              </p>
            </>
          )}

          <div className="text-center text-[11px] text-ink-500 dark:text-ink-400 mt-4">
            Don&apos;t have an account? <Link href="/signup" className="text-brand-600 font-semibold hover:underline">Start free trial →</Link>
          </div>

          <div className="mt-6 pt-5 border-t border-ink-100 dark:border-ink-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-ink-400 dark:text-ink-500 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> One-click demo
            </div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400 mb-3">Click any role to sign in instantly:</div>
            <div className="space-y-1.5">
              {DEMOS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => loginAsDemo(d)}
                  disabled={loading || !!demoLoading}
                  className="w-full group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border border-ink-200 dark:border-ink-700 hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col items-start min-w-0">
                    <span className={`${d.tone === "orange" ? "badge-orange" : d.tone === "blue" ? "badge-blue" : "badge-gray"}`}>{d.badge}</span>
                    <span className="text-[10px] text-ink-500 dark:text-ink-400 mt-0.5">{d.sub}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {demoLoading === d.email ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-ink-400 dark:text-ink-500 mt-2 text-center">
              Demo data only loads after seeding the Platinum Security org.
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
