"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Loader2, Send, X, CheckCircle, Clock } from "lucide-react";

type Callout = {
  id: string; status: string;
  teacherName: string; locationName: string;
  startsAt: string; expiresAt: string; filledAt: string | null;
  offers: { memberName: string; status: string; respondedAt: string | null }[];
};

type AvailableShift = {
  id: string; teacherName: string; locationName: string;
  startsAt: string; endsAt: string; periodLabel: string | null;
};

const SUBJECTS = ["Math", "Science", "English", "History", "Art", "Music", "PE", "Foreign Lang", "Computer Sci", "Special Ed"];

const STATUS_TONE: Record<string, string> = {
  open:     "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  filled:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  expired:  "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400",
  canceled: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

export function SubCalloutClient({
  callouts, availableShifts,
}: { callouts: Callout[]; availableShifts: AvailableShift[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [shiftId, setShiftId] = useState(availableShifts[0]?.id ?? "");
  const [pickedSubjects, setPickedSubjects] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ offersSent: number; expiresAt: string } | null>(null);

  function toggleSubject(s: string) {
    setPickedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    const res = await fetch("/api/sub-callout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shiftId,
        subjects: pickedSubjects,
        notes: notes.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setSuccess({ offersSent: d.callout.offersSent, expiresAt: d.callout.expiresAt });
    setTimeout(() => { setOpen(false); setSuccess(null); r.refresh(); }, 1500);
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function relative(d: string) {
    const diff = +new Date(d) - Date.now();
    if (diff < 0) return "expired";
    const mins = Math.round(diff / 60_000);
    if (mins < 60) return `${mins}m left`;
    return `${Math.round(mins / 60)}h left`;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm" disabled={availableShifts.length === 0}>
          <Send className="w-4 h-4" /> Start callout
        </button>
      </div>

      {callouts.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No callouts yet</h3>
          <p className="text-sm text-ink-500 mt-1">When a teacher calls in sick, hit "Start callout" and we'll page matched subs.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {callouts.map(c => (
            <li key={c.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${STATUS_TONE[c.status]} flex items-center justify-center shrink-0`}>
                  {c.status === "filled" ? <CheckCircle className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {c.teacherName} called out
                    <span className={`ml-2 text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[c.status]}`}>{c.status}</span>
                    {c.status === "open" && (
                      <span className="ml-2 text-[10px] text-ink-500 inline-flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {relative(c.expiresAt)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300">
                    {fmt(c.startsAt)} · {c.locationName} · {c.offers.length} sub{c.offers.length === 1 ? "" : "s"} paged
                    {c.status === "filled" && c.filledAt && ` · filled in ${Math.round((+new Date(c.filledAt) - +new Date(c.startsAt)) / 60_000)}min`}
                  </div>
                  {c.status === "filled" && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      ✓ Filled by: {c.offers.find(o => o.status === "accepted")?.memberName ?? "?"}
                    </div>
                  )}
                </div>
              </div>
              {c.offers.length > 0 && (
                <div className="mt-2 ml-13 pl-3 border-l-2 border-ink-200 dark:border-ink-700">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-500 mb-1">Paged ({c.offers.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.offers.map((o, i) => (
                      <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ${
                        o.status === "accepted"   ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" :
                        o.status === "superseded" ? "bg-ink-50 text-ink-500 dark:bg-ink-800 dark:text-ink-400 line-through" :
                        o.status === "declined"   ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" :
                        "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      }`}>
                        {o.memberName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Start callout modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Megaphone className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Start callout</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            {success ? (
              <div className="p-10 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                <h3 className="font-bold text-lg">{success.offersSent} sub{success.offersSent === 1 ? "" : "s"} paged</h3>
                <p className="text-sm text-ink-500 mt-1">Expires {new Date(success.expiresAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. First to claim wins.</p>
              </div>
            ) : (
              <>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="label">Which teacher's shift?</label>
                    <select className="input" value={shiftId} onChange={(e) => setShiftId(e.target.value)} required>
                      {availableShifts.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.teacherName} · {new Date(s.startsAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}
                          {s.periodLabel && ` (${s.periodLabel})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Subjects (optional — narrows the pool)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SUBJECTS.map(s => (
                        <button key={s} type="button" onClick={() => toggleSubject(s)}
                          className={`px-2 py-1 rounded-full text-[11px] border ${pickedSubjects.includes(s) ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/15 dark:border-brand-500/40" : "border-ink-200 dark:border-ink-700"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-ink-500 mt-1">Leave blank to text every active sub.</p>
                  </div>
                  <div>
                    <label className="label">Notes (optional, included in SMS)</label>
                    <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Sub plans on desk, lesson recap email follows…" />
                  </div>
                  {error && <div className="text-rose-600 text-xs">{error}</div>}
                </div>
                <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
                  <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={busy || !shiftId} className="btn-primary">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Page subs
                  </button>
                </footer>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
