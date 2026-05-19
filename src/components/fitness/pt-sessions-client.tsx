"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Loader2, Plus, X, Check, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Session = {
  id: string;
  trainerId: string; trainerName: string;
  clientName: string; clientPhone: string | null;
  startsAt: string; endsAt: string;
  rateCents: number; trainerSplitPct: number; trainerPayCents: number;
  status: string; notes: string | null;
};

const STATUS_TONE: Record<string, string> = {
  booked:    "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  done:      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  no_show:   "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  cancelled: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400",
};

function localISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PtSessionsClient({
  isManager, myMemberId, initial, trainers,
}: {
  isManager: boolean;
  myMemberId: string | null;
  initial: Session[];
  trainers: { id: string; name: string }[];
}) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [trainerId, setTrainerId] = useState(myMemberId ?? "");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [startsAt, setStartsAt] = useState(() => localISO(new Date(Date.now() + 24 * 3600_000)));
  const [duration, setDuration] = useState(60);
  const [rateDollars, setRateDollars] = useState(80);
  const [splitPct, setSplitPct] = useState(70);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const startDate = new Date(startsAt);
    const endDate = new Date(startDate.getTime() + duration * 60_000);
    const res = await fetch("/api/pt-sessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainerMemberId: trainerId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || null,
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        rateCents: Math.round(rateDollars * 100),
        trainerSplitPct: splitPct,
        notes: notes.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setClientName(""); setClientPhone(""); setNotes(""); r.refresh();
  }

  async function setStatus(s: Session, status: "done" | "no_show" | "cancelled") {
    const res = await fetch(`/api/pt-sessions/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setItems(prev => prev.map(x => x.id === s.id ? { ...x, status } : x));
  }

  async function remove(s: Session) {
    const ok = await confirm({ title: `Delete session with ${s.clientName}?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/pt-sessions/${s.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== s.id));
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Book session</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <UserCheck className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No sessions yet</h3>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(s => (
            <li key={s.id} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${STATUS_TONE[s.status]} flex items-center justify-center shrink-0`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {s.clientName}
                  <span className={`ml-2 text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[s.status]}`}>{s.status.replace("_", " ")}</span>
                </div>
                <div className="text-[11px] text-ink-700 dark:text-ink-300">
                  {fmt(s.startsAt)} → {new Date(s.endsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  {isManager && ` · ${s.trainerName}`}
                </div>
                <div className="text-[11px] text-ink-500">
                  ${(s.rateCents / 100).toFixed(2)} · trainer gets ${(s.trainerPayCents / 100).toFixed(2)} ({s.trainerSplitPct}%)
                </div>
                {s.notes && <div className="text-[11px] text-ink-500 mt-0.5">{s.notes}</div>}
              </div>
              {s.status === "booked" && (isManager || s.trainerId === myMemberId) && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setStatus(s, "done")} className="btn-ghost text-emerald-600 text-xs" title="Mark done">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setStatus(s, "no_show")} className="btn-ghost text-rose-600 text-xs" title="No-show">
                    ✗
                  </button>
                  <button onClick={() => remove(s)} aria-label="Delete" className="btn-ghost text-ink-500 text-xs">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Book PT session</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              {isManager && (
                <div>
                  <label className="label">Trainer</label>
                  <select className="input" value={trainerId} onChange={(e) => setTrainerId(e.target.value)} required>
                    <option value="">Pick trainer…</option>
                    {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Client name *</label>
                <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} required maxLength={120} />
              </div>
              <div>
                <label className="label">Client phone</label>
                <input className="input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} maxLength={20} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Starts</label>
                  <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Duration (min)</label>
                  <input className="input" type="number" min={15} max={240} step={15} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Rate ($)</label>
                  <input className="input" type="number" min={0} max={10000} value={rateDollars} onChange={(e) => setRateDollars(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label">Trainer split (%)</label>
                  <input className="input" type="number" min={0} max={100} value={splitPct} onChange={(e) => setSplitPct(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="text-xs text-ink-500">
                Trainer earns: <b>${(rateDollars * splitPct / 100).toFixed(2)}</b> · House keeps: <b>${(rateDollars * (100 - splitPct) / 100).toFixed(2)}</b>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Book
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
