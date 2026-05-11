"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center p-6"><div className="text-sm text-ink-500">Loading…</div></main>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const sp = useSearchParams();
  const r = useRouter();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Use at least 8 characters"); return; }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
    setDone(true);
    setTimeout(() => r.push("/login"), 1500);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="card p-8 max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
        <p className="text-ink-500 text-sm mb-5">Use at least 8 characters.</p>
        {!done ? (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">New password</label>
              <input className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">Confirm</label>
              <input className="input" type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && <div className="text-rose-600 text-sm">{error}</div>}
            <button className="btn-primary w-full" disabled={loading}>{loading ? "Saving…" : "Update password"}</button>
          </form>
        ) : (
          <div className="text-sm text-emerald-700">Password updated. Redirecting to sign in…</div>
        )}
        <div className="text-center text-xs mt-5"><Link href="/login" className="text-brand-600 hover:underline">Back to sign in</Link></div>
      </div>
    </main>
  );
}
