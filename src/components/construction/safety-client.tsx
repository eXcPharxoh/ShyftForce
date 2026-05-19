"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HardHat, Loader2, Plus, X, Check } from "lucide-react";

type Briefing = {
  id: string; topic: string; details: string | null;
  postedAt: string;
  acks: { memberId: string; name: string; ackedAt: string }[];
  ackedByMe: boolean;
};

export function SafetyClient({
  isManager, myMemberId, totalMembers, initial,
}: { isManager: boolean; myMemberId: string | null; totalMembers: number; initial: Briefing[] }) {
  const r = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/safety-briefings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topic.trim(), details: details.trim() || null }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setTopic(""); setDetails(""); r.refresh();
  }

  async function ack(b: Briefing) {
    const res = await fetch("/api/safety-briefings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefingId: b.id }),
    });
    if (res.ok && myMemberId) {
      setItems(prev => prev.map(x => x.id === b.id ? {
        ...x, ackedByMe: true,
        acks: [...x.acks, { memberId: myMemberId, name: "You", ackedAt: new Date().toISOString() }],
      } : x));
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-3">
      {isManager && (
        <div className="flex justify-end">
          <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Post briefing</button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <HardHat className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No briefings in the last 7 days</h3>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(b => {
            const pct = totalMembers > 0 ? Math.round((b.acks.length / totalMembers) * 100) : 0;
            return (
              <li key={b.id} className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl ${b.ackedByMe ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"} flex items-center justify-center shrink-0`}>
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{b.topic}</div>
                    <div className="text-[11px] text-ink-500">Posted {fmt(b.postedAt)} · {b.acks.length}/{totalMembers} acks ({pct}%)</div>
                  </div>
                  {!b.ackedByMe && myMemberId && (
                    <button onClick={() => ack(b)} className="btn-primary text-xs"><Check className="w-3.5 h-3.5" /> I read it</button>
                  )}
                  {b.ackedByMe && <span className="text-emerald-600 text-xs font-semibold">✓ Acknowledged</span>}
                </div>
                {b.details && <div className="text-[12px] text-ink-700 dark:text-ink-300 ml-13">{b.details}</div>}
                <div className="w-full bg-ink-100 dark:bg-ink-800 rounded-full h-1.5 mt-2">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><HardHat className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Post briefing</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Topic *</label>
                <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} required maxLength={120} placeholder="Trench safety" />
              </div>
              <div>
                <label className="label">Details</label>
                <textarea className="input" rows={5} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} placeholder="Today we're working in 6'+ trenches. Shoring is required on all trenches deeper than 5'. PPE checklist…" />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Post
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
