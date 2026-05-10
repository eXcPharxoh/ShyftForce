"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, Save, Loader2, Send, Users } from "lucide-react";

export type ShiftEditPayload = {
  id: string;
  memberId: string | null;
  memberName: string | null;
  locationId: string;
  locationName: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  position: string;
  notes: string | null;
  status: "draft" | "published";
  isOpen: boolean;
};

export function ShiftEditDialog({
  shift, members, onClose,
}: {
  shift: ShiftEditPayload;
  members: { id: string; name: string }[];
  onClose: () => void;
}) {
  const r = useRouter();
  const [date, setDate] = useState(shift.date);
  const [startTime, setStartTime] = useState(shift.startTime);
  const [endTime, setEndTime] = useState(shift.endTime);
  const [position, setPosition] = useState(shift.position ?? "");
  const [notes, setNotes] = useState(shift.notes ?? "");
  const [memberId, setMemberId] = useState<string | "open">(shift.isOpen ? "open" : (shift.memberId ?? ""));
  const [status, setStatus] = useState<"draft" | "published">(shift.status);
  const [saving, setSaving] = useState<"save" | "delete" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(opts?: { publishToo?: boolean }) {
    setSaving(opts?.publishToo ? "publish" : "save"); setError(null);
    const body: any = {
      date, startTime, endTime,
      position: position || null,
      notes: notes || null,
      status: opts?.publishToo ? "published" : status,
      memberId: memberId === "open" ? null : (memberId || null),
      isOpen: memberId === "open",
    };
    const res = await fetch(`/api/shifts/${shift.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Save failed"); return; }
    onClose(); r.refresh();
  }

  async function remove() {
    if (!confirm("Delete this shift? This cannot be undone.")) return;
    setSaving("delete"); setError(null);
    const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
    setSaving(null);
    if (!res.ok) { setError("Delete failed"); return; }
    onClose(); r.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
          <div>
            <div className="font-semibold text-sm">Edit shift</div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">{shift.locationName}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-5 space-y-3">
          <div>
            <label className="label">Assigned to</label>
            <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value as any)}>
              <option value="open">🟠 Leave as open shift</option>
              <optgroup label="Members">
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
            <label className="label">Position</label>
            <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Server, Security Officer…" />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input min-h-[68px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">Status:</span>
            <button onClick={() => setStatus("draft")} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold ${status === "draft" ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"}`}>Draft</button>
            <button onClick={() => setStatus("published")} className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold ${status === "published" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"}`}>Published</button>
          </div>

          {error && <div className="text-rose-600 dark:text-rose-400 text-xs">{error}</div>}
        </div>

        <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex items-center justify-between shrink-0">
          <button onClick={remove} disabled={!!saving} className="btn-ghost text-rose-600 dark:text-rose-400 text-xs">
            {saving === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            {status === "draft" && (
              <button onClick={() => save({ publishToo: true })} disabled={!!saving} className="btn-outline">
                {saving === "publish" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Save & publish
              </button>
            )}
            <button onClick={() => save()} disabled={!!saving} className="btn-primary">
              {saving === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
