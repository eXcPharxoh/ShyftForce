"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export const dynamic = "force-dynamic";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center p-6"><div className="text-sm text-ink-500">Loading…</div></main>}>
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteInner() {
  const sp = useSearchParams();
  const r = useRouter();
  const token = sp.get("token") ?? "";
  const [step, setStep] = useState<"loading" | "form" | "done" | "error">("loading");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [needsAccount, setNeedsAccount] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Probe the invitation: send empty payload to learn if we need a new account
  useEffect(() => {
    if (!token) { setError("Missing token"); setStep("error"); return; }
    fetch("/api/invites/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async r => {
        const d = await r.json();
        if (r.ok) { setOrgName(d.organizationName); setStep("done"); setTimeout(() => location.href = "/login", 1200); }
        else if (d.needsAccount) { setEmail(d.email ?? ""); setNeedsAccount(true); setStep("form"); }
        else { setError(d.error ?? "Failed"); setStep("error"); }
      }).catch(e => { setError(e.message); setStep("error"); });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSubmitting(true);
    const res = await fetch("/api/invites/accept", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setOrgName(data.organizationName);
    // Auto sign-in
    await signIn("credentials", { email: data.email, password, redirect: false });
    setStep("done");
    setTimeout(() => r.push("/dashboard"), 1000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="card p-8 max-w-sm w-full">
        {step === "loading" && <div className="text-sm text-ink-500">Loading invitation…</div>}
        {step === "error"   && <div className="text-rose-600 text-sm">{error}</div>}
        {step === "done"    && <div className="text-emerald-700">Joined <b>{orgName}</b>! Redirecting…</div>}
        {step === "form"    && (
          <form onSubmit={submit} className="space-y-3">
            <h1 className="text-xl font-bold">Create your account</h1>
            <p className="text-sm text-ink-500">You&apos;re being added to the workspace as <b>{email}</b>.</p>
            <div>
              <label className="label">Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div>
              <label className="label">Password (8+ characters)</label>
              <input className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="text-rose-600 text-sm">{error}</div>}
            <button className="btn-primary w-full" disabled={submitting}>{submitting ? "Joining…" : "Accept invitation"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
