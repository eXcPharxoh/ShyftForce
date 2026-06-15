"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check } from "lucide-react";

type Settings = {
  enabled: boolean;
  earnedRatePercent: number;
  feeCentsPerWithdrawal: number;
  minWithdrawalCents: number;
  maxPerPayPeriodCents: number;
  providerName: string;
  notes: string | null;
};

export function EwaSettingsForm({ initial }: { initial: Settings }) {
  const r = useRouter();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null); setDone(false);
    const res = await fetch("/api/ewa/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setDone(true);
    r.refresh();
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-ink-200 dark:border-ink-700 hover:bg-ink-50/40 dark:hover:bg-ink-800/40">
        <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} className="rounded border-ink-300 text-brand-500" />
        <div className="flex-1">
          <div className="font-semibold text-sm">Enable Earned Wage Access</div>
          <div className="text-[11px] text-ink-500 dark:text-ink-400">Employees can request a portion of earned-but-unpaid wages on demand.</div>
        </div>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Accessible portion</label>
          <div className="flex items-center gap-2">
            <input type="range" min="0" max="100" value={s.earnedRatePercent} onChange={(e) => setS({ ...s, earnedRatePercent: parseInt(e.target.value, 10) })} className="flex-1" />
            <span className="font-bold text-sm w-12 text-right tabular-nums">{s.earnedRatePercent}%</span>
          </div>
          <div className="text-[11px] text-ink-500 mt-1">Most providers default to 50%. Higher = more flexibility, more risk for unpaid time.</div>
        </div>

        <div>
          <label className="label">Provider</label>
          <select className="input" value={s.providerName} onChange={(e) => setS({ ...s, providerName: e.target.value })}>
            <option value="internal_ledger">Internal ledger (deduct from next payroll)</option>
          </select>
          {/* Only the internal-ledger provider is fully wired. Branch /
              Tapcheck / DailyPay / Stripe Treasury exist as scaffolds at
              the lib layer but don't execute real transfers yet — surfacing
              them in this dropdown would let an admin select a payout
              method that then fails on every withdrawal request. Hiding
              until the live integration ships. */}
          <div className="text-[11px] text-ink-500 mt-1">
            Real-money providers (Branch, Tapcheck, DailyPay, Stripe Treasury) are launching soon. Until then, requests record as an IOU against the next paycheck.
          </div>
        </div>

        <div>
          <label className="label">Fee per withdrawal (USD)</label>
          <input className="input" type="number" min="0" step="0.01" value={(s.feeCentsPerWithdrawal/100).toFixed(2)} onChange={(e) => setS({ ...s, feeCentsPerWithdrawal: Math.round(Number(e.target.value)*100) })} />
        </div>
        <div>
          <label className="label">Minimum withdrawal (USD)</label>
          <input className="input" type="number" min="0" step="1" value={(s.minWithdrawalCents/100).toFixed(0)} onChange={(e) => setS({ ...s, minWithdrawalCents: Math.round(Number(e.target.value)*100) })} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Maximum per pay period (USD)</label>
          <input className="input" type="number" min="0" step="50" value={(s.maxPerPayPeriodCents/100).toFixed(0)} onChange={(e) => setS({ ...s, maxPerPayPeriodCents: Math.round(Number(e.target.value)*100) })} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Internal notes (optional)</label>
          <textarea className="input min-h-[68px]" value={s.notes ?? ""} onChange={(e) => setS({ ...s, notes: e.target.value || null })} placeholder="e.g. exclude from manager-paid roles, contact payroll@…" />
        </div>
      </div>

      {error && <div className="text-rose-600 text-xs">{error}</div>}

      <div className="flex justify-end">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {done ? "Saved" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
