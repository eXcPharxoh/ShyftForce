"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";

export function ImpersonateButton({ userId, email, name }: { userId: string; email: string; name: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    const reason = prompt(`Why are you logging in as ${name} (${email})? (logged for audit)`);
    if (reason === null) return; // canceled
    setBusy(true); setError(null);
    const res = await fetch("/api/platform/impersonate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId, reason: reason || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    // Land in target user's dashboard
    r.push("/dashboard");
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button onClick={go} disabled={busy} className="btn-outline text-xs">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
        Login as
      </button>
      {error && <div className="text-[10px] text-rose-600 mt-0.5">{error}</div>}
    </div>
  );
}
