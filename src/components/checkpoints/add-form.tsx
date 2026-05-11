"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

export function AddCheckpointForm({ locations }: { locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [name, setName] = useState("");
  const [seq, setSeq] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!name.trim() || !locationId) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/checkpoints", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId, name: name.trim(),
        expectedSequence: seq ? parseInt(seq, 10) : 0,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setName(""); setSeq("");
    r.refresh();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
      <div>
        <label className="label">Location</label>
        <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="label">Post name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lobby East, Receiving Dock B" />
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="label">Seq (optional)</label>
          <input className="input" type="number" min="0" value={seq} onChange={(e) => setSeq(e.target.value)} placeholder="0" />
        </div>
        <button onClick={add} disabled={busy} className="btn-primary h-10">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
        </button>
      </div>
      {error && <div className="md:col-span-4 text-rose-600 text-xs">{error}</div>}
    </div>
  );
}
