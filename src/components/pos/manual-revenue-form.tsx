"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Loader2 } from "lucide-react";

export function ManualRevenueForm({ locations }: { locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [grossDollars, setGrossDollars] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!grossDollars || isNaN(Number(grossDollars))) { setError("Enter dollar amount"); return; }
    setBusy(true); setError(null); setDone(false);
    const [y, m, d] = date.split("-").map(Number);
    const intervalStart = new Date(y, m - 1, d, 0, 0, 0).toISOString();
    const intervalEnd   = new Date(y, m - 1, d, 23, 59, 59).toISOString();
    const res = await fetch("/api/pos/manual-revenue", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, intervalStart, intervalEnd, grossSalesCents: Math.round(Number(grossDollars) * 100) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setDone(true); setGrossDollars("");
    r.refresh();
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div>
        <label className="label">Location</label>
        <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Date</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label">Gross sales (USD)</label>
        <input className="input" type="number" step="0.01" min="0" value={grossDollars} onChange={(e) => setGrossDollars(e.target.value)} placeholder="2450.00" />
      </div>
      <button onClick={submit} disabled={busy || !locationId} className="btn-primary h-10">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
        {done ? "Saved ✓" : "Log day"}
      </button>
      {error && <div className="md:col-span-4 text-rose-600 text-xs">{error}</div>}
    </div>
  );
}
