"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Plus, X, Sparkles } from "lucide-react";

type Period = { id: string; number: number; name: string | null; startTime: string; endTime: string; daysOfWeek: number[]; active: boolean };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRESET_HS = [
  { number: 1, name: "1st", startTime: "08:00", endTime: "08:50" },
  { number: 2, name: "2nd", startTime: "08:55", endTime: "09:45" },
  { number: 3, name: "3rd", startTime: "09:50", endTime: "10:40" },
  { number: 4, name: "4th", startTime: "10:45", endTime: "11:35" },
  { number: 5, name: "Lunch", startTime: "11:35", endTime: "12:15" },
  { number: 6, name: "5th", startTime: "12:20", endTime: "13:10" },
  { number: 7, name: "6th", startTime: "13:15", endTime: "14:05" },
  { number: 8, name: "7th", startTime: "14:10", endTime: "15:00" },
];

export function ClassPeriodsClient({ initial }: { initial: Period[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState((initial[initial.length - 1]?.number ?? 0) + 1);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:50");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/class-periods", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, name: name.trim() || null, startTime, endTime, daysOfWeek: days }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setNumber(n => n + 1); setName(""); r.refresh();
  }

  async function seedHs() {
    setBusy(true);
    for (const p of PRESET_HS) {
      await fetch("/api/class-periods", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, daysOfWeek: [1,2,3,4,5] }),
      });
    }
    setBusy(false); r.refresh();
  }

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {initial.length === 0 && (
          <button onClick={seedHs} disabled={busy} className="btn-outline text-sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Seed HS bells (8 periods)
          </button>
        )}
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New period</button>
      </div>

      {initial.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No bell schedule defined</h3>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {initial.map(p => (
            <li key={p.id} className="card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0 font-bold text-sm">
                {p.number}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.name ?? `Period ${p.number}`}</div>
                <div className="text-[11px] text-ink-700 dark:text-ink-300">
                  {p.startTime} – {p.endTime} · {p.daysOfWeek.map(d => DAYS[d]).join(" ")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New period</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Number *</label>
                  <input className="input" type="number" min={1} max={20} value={number} onChange={(e) => setNumber(parseInt(e.target.value) || 1)} required />
                </div>
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="1st, Homeroom, Lunch…" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start</label>
                  <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div>
                  <label className="label">End</label>
                  <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="label">Days</label>
                <div className="flex gap-1.5">
                  {DAYS.map((d, i) => (
                    <button key={d} type="button" onClick={() => toggleDay(i)}
                      className={`w-10 h-9 rounded-lg text-xs font-semibold border ${days.includes(i) ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/15 dark:border-brand-500/40" : "border-ink-200 dark:border-ink-700 text-ink-500"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
