"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

type Policy = {
  id: string;
  name: string;
  category: string;
  annualHours: number;
  accrualMethod: string;
  hoursPerDay: number;
  maxBalance: number | null;
  allowNegative: boolean;
  active: boolean;
};

const METHODS = [
  { v: "annual_lump_sum",  l: "Annual lump sum" },
  { v: "per_pay_period",   l: "Per pay period (soon)" },
  { v: "per_hour_worked",  l: "Per hour worked (soon)" },
  { v: "unlimited",        l: "Unlimited" },
];

export function PolicyRow({ policy }: { policy: Policy }) {
  const r = useRouter();
  const [p, setP] = useState(policy);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true); setSaved(false);
    const res = await fetch(`/api/pto/policies/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name,
        annualHours: Number(p.annualHours) || 0,
        accrualMethod: p.accrualMethod,
        hoursPerDay: Number(p.hoursPerDay) || 8,
        maxBalance: p.maxBalance == null || (p.maxBalance as any) === "" ? null : Number(p.maxBalance),
        allowNegative: p.allowNegative,
        active: p.active,
      }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); r.refresh(); }
  }

  return (
    <li className="px-5 py-3">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-3 min-w-0">
          <input className="input h-9 text-sm" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} />
          <div className="text-[10px] uppercase font-semibold tracking-wider text-ink-400 dark:text-ink-500 mt-0.5">{p.category}</div>
        </div>
        <div className="col-span-2">
          <input type="number" min={0} step={1} className="input h-9 text-sm tabular-nums"
                 value={p.annualHours} onChange={e => setP({ ...p, annualHours: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="col-span-2">
          <select className="input h-9 text-sm" value={p.accrualMethod} onChange={e => setP({ ...p, accrualMethod: e.target.value })}>
            {METHODS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <input type="number" min={1} max={24} step={0.5} className="input h-9 text-sm tabular-nums"
                 value={p.hoursPerDay} onChange={e => setP({ ...p, hoursPerDay: parseFloat(e.target.value) || 8 })} />
        </div>
        <div className="col-span-2">
          <input type="number" min={0} step={1} className="input h-9 text-sm tabular-nums"
                 placeholder="No cap"
                 value={p.maxBalance ?? ""} onChange={e => setP({ ...p, maxBalance: e.target.value === "" ? null : parseFloat(e.target.value) })} />
        </div>
        <div className="col-span-1 text-right">
          <input type="checkbox" checked={p.active} onChange={e => setP({ ...p, active: e.target.checked })}
                 className="rounded border-ink-300 dark:border-ink-600 text-brand-500 focus:ring-brand-500" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <label className="text-[11px] flex items-center gap-1.5 text-ink-600 dark:text-ink-400">
          <input type="checkbox" checked={p.allowNegative} onChange={e => setP({ ...p, allowNegative: e.target.checked })}
                 className="rounded border-ink-300 dark:border-ink-600 text-brand-500 focus:ring-brand-500" />
          Allow negative balance
        </label>
        <button onClick={save} disabled={saving} className="btn-primary text-xs ml-auto">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
    </li>
  );
}
