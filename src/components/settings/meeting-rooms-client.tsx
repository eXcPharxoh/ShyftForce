"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Loader2, Plus, X, PenLine } from "lucide-react";

type Room = { id: string; name: string; capacity: number; hasVideo: boolean; hasWhiteboard: boolean; notes: string | null; active: boolean };

export function MeetingRoomsClient({ initial, locations }: { initial: Room[]; locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [hasVideo, setHasVideo] = useState(true);
  const [hasWhiteboard, setHasWhiteboard] = useState(false);
  const [notes, setNotes] = useState("");
  const [locId, setLocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/meeting-rooms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(), capacity, hasVideo, hasWhiteboard,
        notes: notes.trim() || null, locationId: locId || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); setNotes(""); r.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New room</button>
      </div>

      {initial.length === 0 ? (
        <div className="card p-12 text-center">
          <Video className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No rooms yet</h3>
        </div>
      ) : (
        <ul className="space-y-2">
          {initial.map(rm => (
            <li key={rm.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{rm.name} <span className="text-ink-500 font-normal">· {rm.capacity}p</span></div>
                <div className="text-[11px] text-ink-500 flex gap-2">
                  {rm.hasVideo && <span className="inline-flex items-center gap-0.5"><Video className="w-3 h-3" /> Video</span>}
                  {rm.hasWhiteboard && <span className="inline-flex items-center gap-0.5"><PenLine className="w-3 h-3" /> Whiteboard</span>}
                  {!rm.active && <span className="text-rose-600">· Inactive</span>}
                </div>
                {rm.notes && <div className="text-[11px] text-ink-500 mt-0.5">{rm.notes}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Video className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New room</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Olympus, Conference Room A…" />
              </div>
              <div>
                <label className="label">Capacity</label>
                <input className="input" type="number" min={1} max={500} value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 4)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasVideo} onChange={(e) => setHasVideo(e.target.checked)} className="w-4 h-4" /> Video
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasWhiteboard} onChange={(e) => setHasWhiteboard(e.target.checked)} className="w-4 h-4" /> Whiteboard
                </label>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </div>
              <div>
                <label className="label">Location</label>
                <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
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
