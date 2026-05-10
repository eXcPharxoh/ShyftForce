"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const sp = useSearchParams();
  const token = sp.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState<string>("Verifying…");

  useEffect(() => {
    if (!token) { setState("error"); setMsg("Missing token"); return; }
    fetch("/api/auth/verify-email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(r => r.json().then(d => ({ ok: r.ok, data: d }))).then(({ ok, data }) => {
      if (ok) { setState("ok"); setMsg(data.alreadyVerified ? "Email already verified." : "Email verified."); }
      else { setState("error"); setMsg(data.error ?? "Verification failed"); }
    }).catch(e => { setState("error"); setMsg(e.message ?? "Network error"); });
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="card p-10 max-w-sm text-center">
        {state === "loading" && (
          <><Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-ink-400" /><div className="font-semibold">{msg}</div></>
        )}
        {state === "ok" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8" /></div>
            <h1 className="font-bold text-lg">{msg}</h1>
            <p className="text-sm text-ink-500 mt-2">Your account is fully activated.</p>
            <Link href="/dashboard" className="btn-primary w-full mt-5">Open shyftforce</Link>
          </>
        )}
        {state === "error" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8" /></div>
            <h1 className="font-bold text-lg">Verification failed</h1>
            <p className="text-sm text-rose-600 mt-2">{msg}</p>
            <Link href="/login" className="btn-outline w-full mt-5">Back to sign in</Link>
          </>
        )}
      </div>
    </main>
  );
}
