"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Save, Loader2 } from "lucide-react";

const DOW = [
  { v: 1, l: "Mon" }, { v: 2, l: "Tue" }, { v: 3, l: "Wed" }, { v: 4, l: "Thu" },
  { v: 5, l: "Fri" }, { v: 6, l: "Sat" }, { v: 0, l: "Sun" },
];

export function AvailabilityEditor() {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"recurring_unavailable" | "one_off_unavailable">("recurring_unavailable");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    const body: any = { type, notes: notes || null };
    if (type === "recurring_unavailable") body.dayOfWeek = dayOfWeek;
    else                                  body.date = date;
    if (!allDay) { body.startTime = startTime; body.endTime = endTime; }
    const res = await fetch("/api/availability", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed"); return; }
    setOpen(false); r.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add rule</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col text-ink-900 dark:text-ink-50 animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="font-semibold text-sm">When are you unavailable?</div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Type</label>
                <div className="flex gap-2">
                  <button onClick={() => setType("recurring_unavailable")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${type === "recurring_unavailable" ? "bg-brand-500 text-white" : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300"}`}>
                    Every week
                  </button>
                  <button onClick={() => setType("one_off_unavailable")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${type === "one_off_unavailable" ? "bg-brand-500 text-white" : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300"}`}>
                    One specific date
                  </button>
                </div>
              </div>
              {type === "recurring_unavailable" ? (
                <div>
                  <label className="label">Day of week</label>
                  <div className="flex gap-1.5">
                    {DOW.map(d => (
                      <button key={d.v} onClick={() => setDayOfWeek(d.v)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${dayOfWeek === d.v ? "bg-brand-500 text-white" : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300"}`}>
                        {d.l}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="label">Date</label>
                  <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded border-ink-300 dark:border-ink-600 text-brand-500 focus:ring-brand-500" />
                <span className="text-ink-700 dark:text-ink-300">Unavailable all day</span>
              </label>
              {!allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">From</label>
                    <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Until</label>
                    <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <label className="label">Notes (optional)</label>
                <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Class, second job, kids…" />
              </div>
              {error && <div className="text-rose-600 dark:text-rose-400 text-xs">{error}</div>}
            </div>
            <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save rule
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
