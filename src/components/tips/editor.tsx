"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Loader2, Play, Check } from "lucide-react";

type Preview = {
  rows: { memberId: string; name: string; position: string | null; hours: number; weight: number; amountCents: number }[];
  totalDistributedCents: number;
  unallocatedCents: number;
};

export function TipPoolEditor({ locations }: { locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [dollars, setDollars] = useState("");
  const [rule, setRule] = useState<"hours" | "role_weighted" | "equal">("hours");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const totalCents = Math.max(0, Math.round(Number(dollars) * 100));
  const ready = locationId && totalCents > 0;

  async function runPreview() {
    if (!ready) return;
    setBusy("preview"); setError(null); setSaved(false);
    const res = await fetch("/api/tips/preview", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, date, totalTipsCents: totalCents, distributionRule: rule }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setPreview(data);
  }

  async function save(finalize: boolean) {
    if (!preview || !ready) return;
    setBusy("save"); setError(null);
    const res = await fetch("/api/tips", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId, date, totalTipsCents: totalCents, distributionRule: rule,
        notes: notes || null, finalize,
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setSaved(true);
    r.refresh();
    setTimeout(() => { setSaved(false); setPreview(null); setDollars(""); setNotes(""); }, 2500);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <label className="label">Total tips (USD)</label>
          <input className="input" type="number" step="1" min="0" value={dollars} onChange={(e) => setDollars(e.target.value)} placeholder="850.00" />
        </div>
        <div>
          <label className="label">Distribution rule</label>
          <select className="input" value={rule} onChange={(e) => setRule(e.target.value as any)}>
            <option value="hours">By hours worked</option>
            <option value="role_weighted">Role-weighted (server priority)</option>
            <option value="equal">Equal split</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes (optional, kept for audit)</label>
        <textarea className="input min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. credit card tips Friday night, cash kept by individual servers" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={runPreview} disabled={!ready || busy !== null} className="btn-outline">
          {busy === "preview" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Preview distribution
        </button>
      </div>

      {preview && (
        <div className="rounded-xl border border-ink-200 dark:border-ink-700 overflow-hidden">
          <header className="px-4 py-2.5 border-b border-ink-100 dark:border-ink-800 bg-ink-50/40 dark:bg-ink-900/40 flex items-center justify-between">
            <div className="text-sm font-semibold">Distribution preview · {preview.rows.length} contributor{preview.rows.length === 1 ? "" : "s"}</div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
              ${(preview.totalDistributedCents / 100).toFixed(2)} distributed
              {preview.unallocatedCents > 0 && <span className="ml-2 text-amber-700">${(preview.unallocatedCents/100).toFixed(2)} unallocated</span>}
            </div>
          </header>
          {preview.rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-500">No eligible contributors — make sure shifts are published for that day at this location.</div>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {preview.rows.map((r) => (
                <li key={r.memberId} className="px-4 py-2 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-[11px] text-ink-500">{r.position ?? "—"} · {r.hours.toFixed(1)}h worked · weight {r.weight.toFixed(2)}</div>
                  </div>
                  <div className="tabular-nums font-bold text-emerald-700 dark:text-emerald-300">${(r.amountCents / 100).toFixed(2)}</div>
                </li>
              ))}
            </ul>
          )}
          <footer className="px-4 py-3 border-t border-ink-100 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/30 dark:bg-ink-900/30">
            <button onClick={() => save(false)} disabled={busy !== null} className="btn-outline">
              {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} Save as draft
            </button>
            <button onClick={() => save(true)} disabled={busy !== null} className="btn-primary">
              {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Finalize + record
            </button>
          </footer>
        </div>
      )}

      {error && <div className="text-rose-600 text-xs">{error}</div>}
      {saved && <div className="text-emerald-700 text-xs flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Saved!</div>}
    </div>
  );
}
