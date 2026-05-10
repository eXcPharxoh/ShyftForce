"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, X, Save, Pencil } from "lucide-react";

const DOW = [
  { v: 1, l: "Mon" }, { v: 2, l: "Tue" }, { v: 3, l: "Wed" }, { v: 4, l: "Thu" },
  { v: 5, l: "Fri" }, { v: 6, l: "Sat" }, { v: 0, l: "Sun" },
];

type Loc    = { id: string; name: string };
type Member = { id: string; name: string; position: string | null };

type Existing = {
  id: string; memberId: string; locationId: string;
  dayOfWeek: number; startTime: string; endTime: string;
  position: string | null; active: boolean;
};

export function RecurringShiftEditor({
  mode, members, locations, existing,
}: { mode: "create" | "edit"; members: Member[]; locations: Loc[]; existing?: Existing }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState(existing?.memberId ?? members[0]?.id ?? "");
  const [locationId, setLocationId] = useState(existing?.locationId ?? locations[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState<number>(existing?.dayOfWeek ?? 1);
  const [startTime, setStartTime] = useState(existing?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "17:00");
  const [position, setPosition] = useState(existing?.position ?? "");
  const [active, setActive] = useState(existing?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    const url = mode === "create" ? "/api/recurring-shifts" : `/api/recurring-shifts/${existing!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const body: any = { memberId, locationId, dayOfWeek, startTime, endTime, position: position || null, active };
    if (mode === "edit") delete body.memberId;  // can't move pattern between members
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed"); return; }
    setOpen(false); r.refresh();
  }

  async function remove() {
    if (!existing) return;
    if (!confirm("Delete this recurring pattern?")) return;
    setSaving(true);
    await fetch(`/api/recurring-shifts/${existing.id}`, { method: "DELETE" });
    setSaving(false); setOpen(false); r.refresh();
  }

  return (
    <>
      {mode === "create" ? (
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> New pattern</button>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-ghost text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col text-ink-900 dark:text-ink-50 animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="font-semibold text-sm">{mode === "create" ? "New recurring pattern" : "Edit pattern"}</div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Member</label>
                <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)} disabled={mode === "edit"}>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}{m.position ? ` · ${m.position}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Day of week</label>
                <div className="flex gap-1.5">
                  {DOW.map(d => (
                    <button key={d.v} onClick={() => setDayOfWeek(d.v)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${dayOfWeek === d.v
                        ? "bg-brand-500 text-white"
                        : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700"}`}>
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start time</label>
                  <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="label">End time</label>
                  <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Location</label>
                <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Position (optional)</label>
                <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Server, Patrol" />
              </div>
              {mode === "edit" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-ink-300 dark:border-ink-600 text-brand-500 focus:ring-brand-500" />
                  <span className="text-ink-700 dark:text-ink-300">Active</span>
                </label>
              )}
              {error && <div className="text-rose-600 dark:text-rose-400 text-xs">{error}</div>}
            </div>
            <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex items-center justify-between shrink-0">
              {mode === "edit"
                ? <button onClick={remove} className="btn-ghost text-rose-600 dark:text-rose-400 text-xs"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                : <div />}
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                <button onClick={save} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
