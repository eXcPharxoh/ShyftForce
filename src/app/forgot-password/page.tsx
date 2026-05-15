"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false); setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="card p-8 max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-1">Forgot password?</h1>
        <p className="text-ink-500 text-sm mb-5">Enter your email and we'll send you a reset link.</p>
        {!sent ? (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn-primary w-full" disabled={loading || !email}>{loading ? "Sending…" : "Send reset link"}</button>
          </form>
        ) : (
          <div className="text-sm text-ink-700 dark:text-ink-300">
            If an account exists for <b>{email}</b>, a reset email is on its way. Check your spam folder if you don't see it.
          </div>
        )}
        <div className="text-center text-xs mt-5"><Link href="/login" className="text-brand-600 hover:underline">Back to sign in</Link></div>
      </div>
    </main>
  );
}
