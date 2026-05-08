"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-rose-500 text-white p-16">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center font-bold text-2xl">⚡</div>
            <div className="text-2xl font-bold tracking-tight">shyftforce</div>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-3">Workforce that runs itself.</h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Schedules, attendance, payroll, time-off, expenses, HR — across every site, in one place.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
            {[
              ["10+", "Modules"],
              ["4", "Locations"],
              ["Real-time", "Attendance"],
              ["Multi-role", "Access"],
            ].map(([k, v]) => (
              <div key={k} className="bg-white/10 rounded-xl p-4 backdrop-blur">
                <div className="text-2xl font-bold">{k}</div>
                <div className="text-white/70">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm card p-8">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold">⚡</div>
            <div className="text-lg font-bold">shyftforce</div>
          </div>
          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-ink-500 text-sm mb-6">Sign in to your workspace.</p>
          <label className="label">Email</label>
          <input className="input mb-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="label">Password</label>
          <input className="input mb-4" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <div className="text-rose-600 text-sm mb-3">{err}</div>}
          <button className="btn-primary w-full py-2.5" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          <div className="mt-6 text-xs text-ink-500 leading-relaxed">
            <div className="font-medium text-ink-700 mb-1">Demo credentials</div>
            <div>admin@platinum.com / password   <span className="badge-orange">Admin</span></div>
            <div>sarah@platinum.com / password   <span className="badge-blue">Manager</span></div>
            <div>jordan@platinum.com / password  <span className="badge-gray">Employee</span></div>
          </div>
        </form>
      </div>
    </main>
  );
}
