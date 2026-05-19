"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bed, Loader2, Plus, X, Check, Users } from "lucide-react";
import { CsvImportButton } from "@/components/ui/csv-import-button";

const SAMPLE_CSV = `number,floor,type,notes
101,1,standard,
102,1,standard,Near elevator
201,2,suite,Corner suite with view`;

type Room = {
  id: string; number: string; floor: number | null; type: string; status: string; notes: string | null;
  currentHousekeeper: string | null; currentHousekeeperId: string | null; currentAssignmentId: string | null;
  assignmentStartedAt: string | null;
};

const STATUS_TONE: Record<string, string> = {
  clean:        "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  dirty:        "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
  cleaning:     "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  out_of_order: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400 border-ink-200 dark:border-ink-700",
};

export function RoomsClient({
  isManager, myMemberId, initial, members,
}: {
  isManager: boolean;
  myMemberId: string | null;
  initial: Room[];
  members: { id: string; name: string }[];
}) {
  const r = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [floor, setFloor] = useState<number | "">("");
  const [type, setType] = useState<"standard" | "suite" | "accessible" | "family" | "deluxe">("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assign housekeeper
  const [assignFor, setAssignFor] = useState<Room | null>(null);
  const [assignMemberId, setAssignMemberId] = useState("");

  // Filter
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? items : items.filter(r => r.status === filter);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/hotel-rooms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: number.trim(), floor: floor === "" ? null : Number(floor), type }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setNumber(""); r.refresh();
  }

  async function setStatus(rm: Room, status: "clean" | "dirty" | "out_of_order") {
    const res = await fetch("/api/hotel-rooms", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rm.id, status }),
    });
    if (res.ok) setItems(prev => prev.map(x => x.id === rm.id ? { ...x, status } : x));
  }

  async function assignHousekeeper(e: React.FormEvent) {
    e.preventDefault();
    if (!assignFor) return;
    setBusy(true);
    const res = await fetch("/api/room-assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelRoomId: assignFor.id, memberId: assignMemberId }),
    });
    setBusy(false);
    if (res.ok) { setAssignFor(null); r.refresh(); }
  }

  async function completeAssignment(rm: Room) {
    if (!rm.currentAssignmentId) return;
    const res = await fetch("/api/room-assignments", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rm.currentAssignmentId }),
    });
    if (res.ok) {
      setItems(prev => prev.map(x => x.id === rm.id ? { ...x, status: "clean", currentHousekeeper: null, currentAssignmentId: null, currentHousekeeperId: null } : x));
    }
  }

  // Group by floor
  const byFloor: Record<string, Room[]> = {};
  for (const rm of filtered) {
    const f = rm.floor !== null ? `Floor ${rm.floor}` : "Other";
    byFloor[f] = byFloor[f] ?? [];
    byFloor[f].push(rm);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-xl">
          {[
            { v: "all", l: "All" },
            { v: "dirty", l: "Dirty" },
            { v: "cleaning", l: "Cleaning" },
            { v: "clean", l: "Clean" },
            { v: "out_of_order", l: "OoO" },
          ].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === f.v ? "bg-white dark:bg-ink-900 shadow" : ""}`}>{f.l}</button>
          ))}
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <CsvImportButton
              endpoint="/api/import/hotel-rooms"
              label="Import CSV"
              title="Bulk-import hotel rooms"
              sampleCsv={SAMPLE_CSV}
            />
            <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Add room</button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Bed className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No rooms set up</h3>
          {isManager && <p className="text-sm text-ink-500 mt-1">Add your room inventory to start tracking housekeeping.</p>}
        </div>
      ) : (
        Object.entries(byFloor).map(([floor, rooms]) => (
          <section key={floor}>
            <h3 className="text-xs uppercase font-semibold tracking-wider text-ink-500 mb-2">{floor}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {rooms.map(rm => (
                <div key={rm.id} className={`card p-3 border ${STATUS_TONE[rm.status]}`}>
                  <div className="flex items-center gap-1 mb-1">
                    <Bed className="w-4 h-4" />
                    <span className="font-bold text-sm">{rm.number}</span>
                    {rm.type !== "standard" && <span className="text-[10px] text-ink-500">· {rm.type}</span>}
                  </div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider mb-1">{rm.status.replace("_", " ")}</div>
                  {rm.currentHousekeeper && (
                    <div className="text-[11px]">→ {rm.currentHousekeeper}</div>
                  )}
                  {isManager && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {rm.status === "dirty" && <button onClick={() => setAssignFor(rm)} className="text-[10px] btn-ghost p-1"><Users className="w-3 h-3" /></button>}
                      {rm.status === "cleaning" && rm.currentAssignmentId && <button onClick={() => completeAssignment(rm)} className="text-[10px] btn-ghost p-1 text-emerald-600"><Check className="w-3 h-3" /></button>}
                      {rm.status === "clean" && <button onClick={() => setStatus(rm, "dirty")} className="text-[10px] btn-ghost p-1 text-rose-600">Dirty</button>}
                      {rm.status === "out_of_order" && <button onClick={() => setStatus(rm, "clean")} className="text-[10px] btn-ghost p-1 text-emerald-600">OK</button>}
                      {rm.status !== "out_of_order" && <button onClick={() => setStatus(rm, "out_of_order")} className="text-[10px] btn-ghost p-1 text-ink-500">OoO</button>}
                    </div>
                  )}
                  {!isManager && rm.currentHousekeeperId === myMemberId && rm.status === "cleaning" && rm.currentAssignmentId && (
                    <button onClick={() => completeAssignment(rm)} className="btn-outline text-xs mt-1 w-full"><Check className="w-3 h-3" /> Done</button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Add room modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Bed className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Add room</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Room # *</label>
                  <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} required maxLength={20} placeholder="101" />
                </div>
                <div>
                  <label className="label">Floor</label>
                  <input className="input" type="number" min={-5} max={200} value={floor} onChange={(e) => setFloor(e.target.value === "" ? "" : parseInt(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="standard">Standard</option>
                  <option value="suite">Suite</option>
                  <option value="accessible">Accessible</option>
                  <option value="family">Family</option>
                  <option value="deluxe">Deluxe</option>
                </select>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Assign housekeeper modal */}
      {assignFor && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setAssignFor(null)}>
          <form onSubmit={assignHousekeeper} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Users className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Assign room {assignFor.number}</span></div>
              <button type="button" onClick={() => setAssignFor(null)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Housekeeper</label>
                <select className="input" value={assignMemberId} onChange={(e) => setAssignMemberId(e.target.value)} required>
                  <option value="">Pick housekeeper…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setAssignFor(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary"><Check className="w-4 h-4" /> Assign</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
