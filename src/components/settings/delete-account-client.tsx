"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2, Trash2, AlertCircle } from "lucide-react";

export function DeleteAccountClient({ role }: { role: string }) {
  const [confirm, setConfirm] = useState("");
  const [reason, setReason]   = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const PHRASE = "DELETE MY ACCOUNT";
  const canSubmit = confirm === PHRASE;

  async function go() {
    setBusy(true); setError(null);
    const res = await fetch("/api/me/delete-account", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm, reason: reason.trim() || null }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    // Successful — sign out + redirect to landing
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="space-y-3">
      {role === "ADMIN" && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-2.5 text-[11px] text-amber-900 dark:text-amber-300">
          You're an Admin. If you're the only Admin in this org, promote someone else first — otherwise the org gets orphaned and we'll refuse.
        </div>
      )}
      <div>
        <label className="label">Why are you leaving? <span className="text-ink-400 font-normal">(optional)</span></label>
        <textarea className="input min-h-[60px]" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Helps us improve" />
      </div>
      <div>
        <label className="label">Type <code className="font-mono">{PHRASE}</code> to confirm</label>
        <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={PHRASE} />
      </div>
      {error && <div className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</div>}
      <button onClick={go} disabled={!canSubmit || busy}
        className="btn-outline border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        {busy ? "Deleting…" : "Delete my account"}
      </button>
    </div>
  );
}
