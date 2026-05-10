"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Loader2, X, Send } from "lucide-react";

type Member = { id: string; name: string };

export function SwapRequestButton({ shiftId, members }: { shiftId: string; members: Member[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState(members[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function send() {
    setBusy(true); setError(null);
    const res = await fetch("/api/shift-swaps", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, targetMemberId: targetId, message: message || null }),
    });
    setBusy(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed"); return; }
    setDone(true); r.refresh();
    setTimeout(() => { setOpen(false); setDone(false); }, 1500);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-xs"><Repeat className="w-3.5 h-3.5" /> Request swap</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col text-ink-900 dark:text-ink-50 animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div>
                <div className="font-semibold text-sm">Request shift swap</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">They'll be DM'd. A manager approves the final swap.</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Send to</label>
                <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Message (optional)</label>
                <textarea className="input min-h-[68px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why you're asking, what you'd take in exchange…" />
              </div>
              {error && <div className="text-rose-600 dark:text-rose-400 text-xs">{error}</div>}
              {done && <div className="text-emerald-700 dark:text-emerald-300 text-xs">Sent! ✨</div>}
            </div>
            <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={send} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send request
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
