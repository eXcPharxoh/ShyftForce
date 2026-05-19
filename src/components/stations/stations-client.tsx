"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinned, Loader2, Sparkles, X, Save } from "lucide-react";

type ShiftRow = {
  id: string; memberId: string; memberName: string;
  locationId: string; locationName: string;
  startsAt: string; endsAt: string; position: string | null;
  currentStation: string | null; assignmentId: string | null;
};
type Loc = { id: string; name: string };

const COMMON_STATIONS = ["Patio", "Bar", "Tables 1-10", "Tables 11-20", "Window", "Counter", "Grill", "Sauté", "Salad", "Fry", "Pizza", "Expo"];

export function StationsClient({ initial, locations }: { initial: ShiftRow[]; locations: Loc[] }) {
  const r = useRouter();
  const [rows, setRows] = useState(initial);
  const [locFilter, setLocFilter] = useState<string>("");
  const [editing, setEditing] = useState<ShiftRow | null>(null);
  const [station, setStation] = useState("");
  const [busy, setBusy] = useState(false);

  // Suggestor state
  const [suggestStation, setSuggestStation] = useState<string>("Patio");
  const [suggestions, setSuggestions] = useState<{ memberId: string; name: string; recentCount: number; lastAssignedAt: string | null }[]>([]);
  const [suggestLoc, setSuggestLoc] = useState(locations[0]?.id ?? "");
  const [suggestBusy, setSuggestBusy] = useState(false);

  const visible = rows.filter(r => !locFilter || r.locationId === locFilter);

  async function save() {
    if (!editing) return;
    setBusy(true);
    const res = await fetch("/api/stations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId: editing.id, memberId: editing.memberId, station: station.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setRows(prev => prev.map(x => x.id === editing.id ? { ...x, currentStation: station.trim(), assignmentId: d.assignment.id } : x));
      setEditing(null); setStation("");
    }
  }

  async function suggest() {
    setSuggestBusy(true);
    const res = await fetch(`/api/stations?suggest=${encodeURIComponent(suggestStation)}&location=${suggestLoc}`);
    const d = await res.json();
    setSuggestBusy(false);
    if (res.ok) setSuggestions(d.ranked ?? []);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select className="input h-9 text-sm w-auto" value={locFilter} onChange={(e) => setLocFilter(e.target.value)}>
          <option value="">All locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Fair rotation suggestor */}
      <section className="card p-5 bg-gradient-to-br from-brand-50 to-rose-50 dark:from-brand-500/10 dark:to-rose-500/10 border-brand-200/60 dark:border-brand-500/30">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Sparkles className="w-4 h-4 text-brand-500" /> Fair rotation suggestor</h3>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="label">Station</label>
            <input className="input h-9 text-sm w-40" list="stations" value={suggestStation} onChange={(e) => setSuggestStation(e.target.value)} />
            <datalist id="stations">{COMMON_STATIONS.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label className="label">Location</label>
            <select className="input h-9 text-sm w-44" value={suggestLoc} onChange={(e) => setSuggestLoc(e.target.value)}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <button onClick={suggest} disabled={suggestBusy} className="btn-primary h-9 text-sm">
            {suggestBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Rank
          </button>
        </div>
        {suggestions.length > 0 && (
          <ol className="mt-3 space-y-1 text-xs">
            {suggestions.slice(0, 8).map((s, i) => (
              <li key={s.memberId} className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${i === 0 ? "bg-emerald-500 text-white" : i < 3 ? "bg-amber-400 text-white" : "bg-ink-100 text-ink-700 dark:bg-ink-800"}`}>{i + 1}</span>
                <span className="font-semibold">{s.name}</span>
                <span className="text-ink-500">
                  {s.recentCount === 0 ? "never assigned in last 30d" : `${s.recentCount} time${s.recentCount === 1 ? "" : "s"} in last 30d`}
                  {s.lastAssignedAt && ` · last ${new Date(s.lastAssignedAt).toLocaleDateString()}`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Shifts list */}
      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
          <h3 className="text-sm font-semibold">This week's shifts</h3>
        </header>
        {visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">No assigned shifts this week.</div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {visible.map(s => (
              <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <b>{s.memberName}</b> <span className="text-ink-500">· {s.position ?? "shift"} at {s.locationName}</span>
                  </div>
                  <div className="text-[11px] text-ink-500">
                    {new Date(s.startsAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} → {new Date(s.endsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.currentStation && <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 text-[10px]">{s.currentStation}</span>}
                  <button onClick={() => { setEditing(s); setStation(s.currentStation ?? ""); }} className="btn-outline text-xs">
                    <MapPinned className="w-3.5 h-3.5" /> {s.currentStation ? "Change" : "Assign"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm">Assign station for {editing.memberName}</div>
              <button onClick={() => setEditing(null)} aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <input className="input" value={station} list="stations-modal" onChange={(e) => setStation(e.target.value)} placeholder="Patio" autoFocus />
            <datalist id="stations-modal">{COMMON_STATIONS.map(s => <option key={s} value={s} />)}</datalist>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={busy || !station.trim()} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
