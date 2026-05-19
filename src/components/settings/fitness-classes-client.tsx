"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2, Plus, X, Sparkles } from "lucide-react";

type Klass = { id: string; name: string; durationMins: number; capacity: number; color: string; description: string | null; active: boolean; upcomingOccurrences: number };

const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#6366f1", "#84cc16"];

export function FitnessClassesClient({ initial, presets }: { initial: Klass[]; presets: { name: string; durationMins: number; color: string }[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(20);
  const [color, setColor] = useState(COLORS[0]);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/fitness-classes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(), durationMins: duration, capacity, color,
        description: description.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); setDescription(""); r.refresh();
  }

  async function seedPresets() {
    setBusy(true);
    for (const p of presets) {
      await fetch("/api/fitness-classes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, capacity: 20 }),
      });
    }
    setBusy(false); r.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {initial.length === 0 && (
          <button onClick={seedPresets} disabled={busy} className="btn-outline text-sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Seed {presets.length} popular classes
          </button>
        )}
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New class</button>
      </div>

      {initial.length === 0 ? (
        <div className="card p-12 text-center">
          <Dumbbell className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No classes defined</h3>
        </div>
      ) : (
        <ul className="space-y-2">
          {initial.map(c => (
            <li key={c.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold" style={{ background: c.color }}>
                <Dumbbell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{c.name}
                  <span className="ml-2 text-ink-500 font-normal text-xs">{c.durationMins}m · {c.capacity} cap</span>
                </div>
                {c.description && <div className="text-[11px] text-ink-500">{c.description}</div>}
                <div className="text-[11px] text-ink-700 dark:text-ink-300">{c.upcomingOccurrences} upcoming session{c.upcomingOccurrences === 1 ? "" : "s"}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New class</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Sunrise Yoga" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Duration (min)</label>
                  <input className="input" type="number" min={15} max={240} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input className="input" type="number" min={1} max={500} value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 20)} />
                </div>
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-lg ring-2 ${color === c ? "ring-ink-900 dark:ring-white" : "ring-transparent"}`}
                      style={{ background: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
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
