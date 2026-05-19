"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2, Plus, X, Check, Link as LinkIcon, Copy } from "lucide-react";

type Slot = {
  id: string; teacherId: string; teacherName: string;
  startsAt: string; endsAt: string; notes: string | null;
  booking: { parentName: string; studentName: string; parentEmail: string | null; parentPhone: string | null; notes: string | null } | null;
};

function localISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ConferencesClient({
  isManager, myMemberId, initial, teachers,
}: {
  isManager: boolean;
  myMemberId: string | null;
  initial: Slot[];
  teachers: { id: string; name: string }[];
}) {
  const r = useRouter();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function openShareLink() {
    const teacherId = isManager ? (teachers[0]?.id ?? myMemberId) : myMemberId;
    if (!teacherId) return;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    setShareLink(`${base}/book/conference/${teacherId}`);
  }

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState(myMemberId ?? "");
  const [startsAt, setStartsAt] = useState(() => localISO(new Date(Date.now() + 24 * 3600_000)));
  const [duration, setDuration] = useState(15);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Book slot
  const [bookFor, setBookFor] = useState<Slot | null>(null);
  const [parentName, setParentName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + duration * 60_000);
    const res = await fetch("/api/conferences", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherMemberId: teacherId,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        notes: notes.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); r.refresh();
  }

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!bookFor) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/conferences", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId: bookFor.id,
        parentName: parentName.trim(),
        studentName: studentName.trim(),
        parentEmail: parentEmail.trim() || null,
        parentPhone: parentPhone.trim() || null,
        notes: bookNotes.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setItems(prev => prev.map(x => x.id === bookFor.id ? { ...x, booking: { parentName, studentName, parentEmail, parentPhone, notes: bookNotes } } : x));
    setBookFor(null); setParentName(""); setStudentName(""); setParentEmail(""); setParentPhone(""); setBookNotes("");
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function tm(d: string) {
    return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  // Group by day
  const byDay: Record<string, Slot[]> = {};
  for (const s of items) {
    const k = new Date(s.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    byDay[k] = byDay[k] ?? [];
    byDay[k].push(s);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <button onClick={openShareLink} className="btn-outline text-sm"><LinkIcon className="w-4 h-4" /> Public booking link</button>
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Open slot</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No conference slots open</h3>
        </div>
      ) : (
        Object.entries(byDay).map(([day, slots]) => (
          <section key={day}>
            <h3 className="text-xs uppercase font-semibold tracking-wider text-ink-500 mb-2">{day}</h3>
            <ul className="space-y-1.5">
              {slots.map(s => (
                <li key={s.id} className="card p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${s.booking ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"} flex items-center justify-center shrink-0`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">
                      {tm(s.startsAt)} – {tm(s.endsAt)}
                      {isManager && <span className="text-ink-500 font-normal text-xs"> · {s.teacherName}</span>}
                    </div>
                    {s.booking ? (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        ✓ Booked: {s.booking.parentName} for {s.booking.studentName}
                        {s.booking.parentEmail && ` · ${s.booking.parentEmail}`}
                      </div>
                    ) : (
                      <div className="text-[11px] text-ink-500">Open · 15 min</div>
                    )}
                  </div>
                  {!s.booking && (
                    <button onClick={() => setBookFor(s)} className="btn-outline text-xs"><Check className="w-3 h-3" /> Book</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/* Open slot modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Open conference slot</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              {isManager && (
                <div>
                  <label className="label">Teacher</label>
                  <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
                    <option value="">Pick teacher…</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Starts</label>
                  <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Duration (min)</label>
                  <input className="input" type="number" min={5} max={120} step={5} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 15)} />
                </div>
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
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Open
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Book slot modal */}
      {bookFor && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setBookFor(null)}>
          <form onSubmit={book} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Book {fmt(bookFor.startsAt)}</span></div>
              <button type="button" onClick={() => setBookFor(null)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Parent name *</label>
                  <input className="input" value={parentName} onChange={(e) => setParentName(e.target.value)} required maxLength={120} />
                </div>
                <div>
                  <label className="label">Student name *</label>
                  <input className="input" value={studentName} onChange={(e) => setStudentName(e.target.value)} required maxLength={120} />
                </div>
              </div>
              <div>
                <label className="label">Parent email</label>
                <input className="input" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
              </div>
              <div>
                <label className="label">Parent phone</label>
                <input className="input" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} maxLength={20} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} maxLength={500} />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setBookFor(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Book
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Share-link modal */}
      {shareLink && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShareLink(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><LinkIcon className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Public booking link</span></div>
              <button onClick={() => setShareLink(null)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <p className="text-sm text-ink-700 dark:text-ink-300">
                Share this link with parents. They can book any open slot without logging in.
              </p>
              <div className="flex items-center gap-2 p-3 bg-ink-50 dark:bg-ink-800 rounded-lg">
                <code className="text-xs font-mono flex-1 truncate">{shareLink}</code>
                <button onClick={copyLink} className="btn-outline text-xs shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-[11px] text-ink-500">
                The link shows only your open future slots and only allows new bookings on this teacher's slots. Each slot is single-booking — once filled, it disappears.
              </p>
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button onClick={() => setShareLink(null)} className="btn-primary">Done</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
