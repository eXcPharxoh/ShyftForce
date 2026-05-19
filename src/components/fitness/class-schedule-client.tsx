"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2, Plus, X, Check, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Occurrence = {
  id: string; className: string; color: string; capacity: number;
  instructorName: string; instructorId: string;
  startsAt: string; endsAt: string;
  room: string | null; status: string; attendees: number; notes: string | null;
};

function localISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ClassScheduleClient({
  isManager, myMemberId, initial, classes, instructors,
}: {
  isManager: boolean;
  myMemberId: string | null;
  initial: Occurrence[];
  classes: { id: string; name: string; color: string; durationMins: number }[];
  instructors: { id: string; name: string }[];
}) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [instructorId, setInstructorId] = useState("");
  const [startsAt, setStartsAt] = useState(() => localISO(new Date(Date.now() + 24 * 3600_000)));
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [attFor, setAttFor] = useState<Occurrence | null>(null);
  const [attN, setAttN] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const klass = classes.find(c => c.id === classId);
    if (!klass) { setError("Pick a class"); setBusy(false); return; }
    const startDate = new Date(startsAt);
    const endDate = new Date(startDate.getTime() + klass.durationMins * 60_000);
    const res = await fetch("/api/class-occurrences", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fitnessClassId: classId,
        instructorMemberId: instructorId,
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        room: room.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); r.refresh();
  }

  async function remove(o: Occurrence) {
    const ok = await confirm({ title: `Cancel ${o.className}?`, tone: "danger", confirmLabel: "Cancel class" });
    if (!ok) return;
    const res = await fetch(`/api/class-occurrences/${o.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== o.id));
  }

  async function markDone(o: Occurrence) {
    const res = await fetch(`/api/class-occurrences/${o.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    if (res.ok) setItems(prev => prev.map(x => x.id === o.id ? { ...x, status: "done" } : x));
  }

  async function logAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!attFor) return;
    const res = await fetch(`/api/class-occurrences/${attFor.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendees: attN, status: "done" }),
    });
    if (res.ok) {
      setItems(prev => prev.map(x => x.id === attFor.id ? { ...x, attendees: attN, status: "done" } : x));
      setAttFor(null);
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function timeOnly(d: string) {
    return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  // Group by date
  const byDay: Record<string, Occurrence[]> = {};
  for (const o of items) {
    const k = new Date(o.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    byDay[k] = byDay[k] ?? [];
    byDay[k].push(o);
  }

  return (
    <div className="space-y-3">
      {isManager && (
        <div className="flex justify-end">
          <button onClick={() => setOpen(true)} className="btn-primary text-sm" disabled={classes.length === 0 || instructors.length === 0}>
            <Plus className="w-4 h-4" /> Schedule class
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Dumbbell className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No classes in the next 2 weeks</h3>
          {isManager && classes.length === 0 && <p className="text-sm text-ink-500 mt-1">Create class templates at <code>/settings/fitness-classes</code> first.</p>}
        </div>
      ) : (
        Object.entries(byDay).map(([day, list]) => (
          <section key={day}>
            <h3 className="text-xs uppercase font-semibold tracking-wider text-ink-500 mb-2">{day}</h3>
            <ul className="space-y-1.5">
              {list.map(o => (
                <li key={o.id} className="card p-3 flex items-center gap-3">
                  <div className="w-1.5 h-12 rounded-full shrink-0" style={{ background: o.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">
                      {o.className}
                      {o.status === "done" && <span className="ml-2 text-[10px] text-emerald-600 uppercase font-semibold tracking-wider">Done · {o.attendees}/{o.capacity}</span>}
                      {o.status === "cancelled" && <span className="ml-2 text-[10px] text-rose-600 uppercase font-semibold tracking-wider">Cancelled</span>}
                    </div>
                    <div className="text-[11px] text-ink-700 dark:text-ink-300">
                      <b>{timeOnly(o.startsAt)} – {timeOnly(o.endsAt)}</b>
                      {" · "}{o.instructorName}
                      {o.room && ` · ${o.room}`}
                    </div>
                  </div>
                  {isManager && o.status === "scheduled" && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setAttFor(o); setAttN(0); }} className="btn-ghost text-xs" title="Log attendance">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(o)} aria-label="Cancel" className="btn-ghost text-rose-600 text-xs">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {!isManager && o.instructorId === myMemberId && o.status === "scheduled" && (
                    <button onClick={() => markDone(o)} className="btn-outline text-xs"><Check className="w-3.5 h-3.5" /> Done</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/* Schedule modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Schedule class</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Class</label>
                <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)} required>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.durationMins} min)</option>)}
                </select>
              </div>
              <div>
                <label className="label">Instructor</label>
                <select className="input" value={instructorId} onChange={(e) => setInstructorId(e.target.value)} required>
                  <option value="">Pick instructor…</option>
                  {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Starts</label>
                <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
              </div>
              <div>
                <label className="label">Room (optional)</label>
                <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} maxLength={80} placeholder="Studio A, Spin Room…" />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Schedule
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Attendance modal */}
      {attFor && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAttFor(null)}>
          <form onSubmit={logAttendance} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Attendance: {attFor.className}</span></div>
              <button type="button" onClick={() => setAttFor(null)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div className="text-[11px] text-ink-500">{fmt(attFor.startsAt)} · {attFor.instructorName}</div>
              <div>
                <label className="label">Attendees ({attFor.capacity} max)</label>
                <input className="input" type="number" min={0} max={attFor.capacity * 2} value={attN} onChange={(e) => setAttN(parseInt(e.target.value) || 0)} autoFocus />
              </div>
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setAttFor(null)} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary"><Check className="w-4 h-4" /> Save &amp; mark done</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
