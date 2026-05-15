"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, X, ShieldAlert } from "lucide-react";

export function ImpersonateButton({ userId, email, name }: { userId: string; email: string; name: string }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/platform/impersonate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId, reason: reason.trim() || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    // Land in target user's dashboard
    setOpen(false);
    r.push("/dashboard");
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setReason(""); setError(null); }}
        aria-label={`Login as ${name}`}
        className="btn-outline text-xs"
      >
        <LogIn className="w-3.5 h-3.5" /> Login as
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={go} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-sm">Login as user</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close dialog" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-5 space-y-3">
              <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-300">
                You're about to sign in as <b>{name}</b> ({email}). Every action you take will appear in their org's audit log
                tagged with your platform-admin email. Sessions auto-expire in 4 hours.
              </div>
              <div>
                <label className="label">Reason for impersonation</label>
                <textarea
                  className="input min-h-[80px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Troubleshooting their schedule import bug · Support ticket #482"
                  maxLength={280}
                  required
                  minLength={4}
                />
                <p className="text-[11px] text-ink-500 mt-1">Required. Logged to the audit trail. {280 - reason.length} chars left.</p>
              </div>
              {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 border border-rose-200 dark:border-rose-500/30">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || reason.trim().length < 4} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {busy ? "Starting…" : "Sign in as user"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
