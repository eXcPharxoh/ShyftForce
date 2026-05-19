"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2, Plus, X, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Rule = {
  id: string; locationId: string | null; locationName: string | null;
  unit: string; customLabel: string | null; role: string;
  patientCount: number; staffCount: number;
  notes: string | null; active: boolean;
};

const UNITS = [
  { v: "med_surg",   l: "Med-surg" },
  { v: "icu",        l: "ICU / Critical care" },
  { v: "step_down",  l: "Step-down / Telemetry" },
  { v: "ed",         l: "Emergency department" },
  { v: "psych",      l: "Psychiatric" },
  { v: "labor",      l: "Labor & delivery" },
  { v: "pacu",       l: "Post-anesthesia (PACU)" },
  { v: "lt_care",    l: "Long-term care" },
  { v: "custom",     l: "Custom" },
];

const CA_DEFAULTS = [
  { unit: "icu",       role: "RN", patientCount: 2, staffCount: 1 },
  { unit: "step_down", role: "RN", patientCount: 4, staffCount: 1 },
  { unit: "med_surg",  role: "RN", patientCount: 5, staffCount: 1 },
  { unit: "ed",        role: "RN", patientCount: 4, staffCount: 1 },
  { unit: "psych",     role: "RN", patientCount: 6, staffCount: 1 },
];

export function PatientRatiosClient({ locations, initial }: { locations: { id: string; name: string }[]; initial: Rule[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState("med_surg");
  const [customLabel, setCustomLabel] = useState("");
  const [role, setRole] = useState<"RN" | "LPN" | "CNA">("RN");
  const [patientCount, setPatientCount] = useState(5);
  const [staffCount, setStaffCount] = useState(1);
  const [locId, setLocId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/patient-ratios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unit, customLabel: unit === "custom" ? customLabel.trim() : null,
        role, patientCount, staffCount,
        locationId: locId || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); r.refresh();
  }

  async function remove(rule: Rule) {
    const ok = await confirm({ title: `Delete this rule?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/patient-ratios/${rule.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== rule.id));
  }

  async function seedDefaults() {
    setBusy(true);
    for (const d of CA_DEFAULTS) {
      await fetch("/api/patient-ratios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
    }
    setBusy(false); r.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {items.length === 0 && (
          <button onClick={seedDefaults} disabled={busy} className="btn-outline text-sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Seed CA defaults
          </button>
        )}
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New rule</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Activity className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No ratio rules yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">Seed California Title 22 defaults to get started, or add custom rules for your jurisdiction.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(rule => (
            <li key={rule.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {rule.customLabel ?? UNITS.find(u => u.v === rule.unit)?.l ?? rule.unit}
                  <span className="text-ink-500 font-normal"> · {rule.role}</span>
                </div>
                <div className="text-[11px] text-ink-700 dark:text-ink-300">
                  <b>{rule.staffCount} {rule.role}</b> per <b>{rule.patientCount}</b> patient{rule.patientCount === 1 ? "" : "s"}
                  {rule.locationName && ` · ${rule.locationName}`}
                </div>
              </div>
              <button onClick={() => remove(rule)} aria-label="Delete rule" className="btn-ghost text-rose-600 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New ratio rule</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {UNITS.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                    <option value="RN">RN</option>
                    <option value="LPN">LPN</option>
                    <option value="CNA">CNA</option>
                  </select>
                </div>
              </div>
              {unit === "custom" && (
                <div>
                  <label className="label">Custom label *</label>
                  <input className="input" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} required maxLength={80} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{role}s per group</label>
                  <input className="input" type="number" min={1} max={20} value={staffCount} onChange={(e) => setStaffCount(parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="label">Patients per group</label>
                  <input className="input" type="number" min={1} max={100} value={patientCount} onChange={(e) => setPatientCount(parseInt(e.target.value) || 1)} />
                </div>
              </div>
              <div>
                <label className="label">Location (optional)</label>
                <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <p className="text-[11px] text-ink-500">
                Reads as: <b>{staffCount} {role}</b> per <b>{patientCount}</b> patient{patientCount === 1 ? "" : "s"}
              </p>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add rule
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
