"use client";
import { useState } from "react";
import { Calendar, Clock, Loader2, Check, X } from "lucide-react";

type Slot = { id: string; startsAt: string; endsAt: string; notes: string | null };

export function PublicConferenceClient({
  teacherId, teacherName, slots,
}: { teacherId: string; teacherName: string; slots: Slot[] }) {
  const [pickedSlot, setPickedSlot] = useState<Slot | null>(null);
  const [parentName, setParentName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ when: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickedSlot) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/book/conference/${teacherId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId: pickedSlot.id,
        parentName: parentName.trim(),
        studentName: studentName.trim(),
        parentEmail: parentEmail.trim() || null,
        parentPhone: parentPhone.trim() || null,
        notes: notes.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Booking failed"); return; }
    setSuccess({ when: fmt(pickedSlot.startsAt) });
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function tm(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  // Group slots by day
  const byDay: Record<string, Slot[]> = {};
  for (const s of slots) {
    const k = new Date(s.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    byDay[k] = byDay[k] ?? [];
    byDay[k].push(s);
  }

  if (success) {
    return (
      <div className="card p-8 text-center bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/30">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">You're booked!</h2>
        <p className="text-ink-700 dark:text-ink-300 mb-4">
          Your conference with {teacherName} is confirmed for <b>{success.when}</b>.
        </p>
        {parentEmail && <p className="text-xs text-ink-500">A confirmation email is on its way to {parentEmail}.</p>}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Calendar className="w-10 h-10 mx-auto text-ink-300 mb-3" />
        <h3 className="font-bold">No open slots</h3>
        <p className="text-sm text-ink-500 mt-1">{teacherName} doesn't have any open conference slots right now.</p>
      </div>
    );
  }

  return (
    <>
      {Object.entries(byDay).map(([day, daySlots]) => (
        <section key={day} className="mb-6">
          <h3 className="text-xs uppercase font-semibold tracking-wider text-ink-500 mb-2">{day}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {daySlots.map(s => (
              <button
                key={s.id}
                onClick={() => setPickedSlot(s)}
                className="card p-3 text-center hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-500/10 transition"
              >
                <div className="text-sm font-semibold">{tm(s.startsAt)}</div>
                <div className="text-[11px] text-ink-500">to {tm(s.endsAt)}</div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {pickedSlot && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setPickedSlot(null)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">{fmt(pickedSlot.startsAt)}</span></div>
              <button type="button" onClick={() => setPickedSlot(null)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Your name *</label>
                  <input className="input" value={parentName} onChange={(e) => setParentName(e.target.value)} required maxLength={120} autoFocus />
                </div>
                <div>
                  <label className="label">Student name *</label>
                  <input className="input" value={studentName} onChange={(e) => setStudentName(e.target.value)} required maxLength={120} />
                </div>
              </div>
              <div>
                <label className="label">Email (for confirmation)</label>
                <input className="input" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} maxLength={200} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} maxLength={20} />
              </div>
              <div>
                <label className="label">Notes for the teacher (optional)</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setPickedSlot(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm booking
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
