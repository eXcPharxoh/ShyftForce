"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Target } from "lucide-react";

type Target = { id: string; locationId: string; targetPercent: number; breachThreshold: number; cooldownMinutes: number; active: boolean; lastAlertAt: string | null; lastAlertActualPercent: number | null };
type Loc = { id: string; name: string };

export function LaborTargetClient({ locations, initial }: { locations: Loc[]; initial: Target[] }) {
  const r = useRouter();
  const byLoc = new Map(initial.map(t => [t.locationId, t]));

  return (
    <div className="space-y-2">
      {locations.map(l => {
        const existing = byLoc.get(l.id);
        return <Row key={l.id} location={l} existing={existing} onChanged={() => r.refresh()} />;
      })}
      {locations.length === 0 && <p className="text-sm text-ink-500">Add a location first.</p>}
    </div>
  );
}

function Row({ location, existing, onChanged }: { location: Loc; existing: Target | undefined; onChanged: () => void }) {
  const [percent, setPercent] = useState(existing?.targetPercent ?? 28);
  const [threshold, setThreshold] = useState(existing?.breachThreshold ?? 3);
  const [cooldown, setCooldown] = useState(existing?.cooldownMinutes ?? 60);
  const [active, setActive] = useState(existing?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setSaved(false);
    const res = await fetch("/api/labor-targets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: location.id, targetPercent: percent, breachThreshold: threshold, cooldownMinutes: cooldown, active }),
    });
    setBusy(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); onChanged(); }
  }

  return (
    <div className="card p-4 flex items-center gap-3 flex-wrap">
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
        <Target className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{location.name}</div>
        {existing?.lastAlertAt && (
          <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
            Last alert: {existing.lastAlertActualPercent?.toFixed(1)}% on {new Date(existing.lastAlertAt).toLocaleString()}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs flex items-center gap-1">Target<input className="input h-8 w-16 text-xs" type="number" min={0} max={100} step="0.5" value={percent} onChange={(e) => setPercent(parseFloat(e.target.value) || 0)} />%</label>
        <label className="text-xs flex items-center gap-1">±<input className="input h-8 w-14 text-xs" type="number" min={0} max={20} step="0.5" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)} />pp</label>
        <label className="text-xs flex items-center gap-1">cooldown<input className="input h-8 w-16 text-xs" type="number" min={15} max={240} step={5} value={cooldown} onChange={(e) => setCooldown(parseInt(e.target.value) || 60)} />min</label>
        <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded text-brand-500" />Active</label>
        <button onClick={save} disabled={busy} className="btn-primary text-xs">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? "Saved ✓" : <><Save className="w-3.5 h-3.5" /> Save</>}
        </button>
      </div>
    </div>
  );
}
