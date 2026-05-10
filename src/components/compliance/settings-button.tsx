"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, X } from "lucide-react";
import type { ComplianceSettings } from "@/lib/compliance/engine";

export function ComplianceSettingsButton({ settings }: { settings: ComplianceSettings }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/compliance/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setSaving(false); setOpen(false); r.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline h-9"><SettingsIcon className="w-4 h-4" /> Configure rules</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col text-ink-900 dark:text-ink-50 animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="font-semibold text-sm">Compliance rules</div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3 overflow-y-auto">
              <Field label="Max weekly hours"          v={s.maxWeeklyHours}              step={1}    onChange={v => setS({...s, maxWeeklyHours: v})} />
              <Field label="Max daily hours"           v={s.maxDailyHours}               step={0.5}  onChange={v => setS({...s, maxDailyHours: v})} />
              <Field label="Min rest gap (hours)"      v={s.minRestGapHours}             step={0.5}  onChange={v => setS({...s, minRestGapHours: v})} />
              <Field label="Meal break required after" v={s.mealBreakRequiredAfterHours} step={0.5}  onChange={v => setS({...s, mealBreakRequiredAfterHours: v})} />
              <Field label="Max consecutive days"      v={s.maxConsecutiveDays}          step={1}    onChange={v => setS({...s, maxConsecutiveDays: Math.round(v)})} integer />
              <Field label="Predictive scheduling (days ahead, 0 = off)"
                                                       v={s.predictiveSchedulingDays}    step={1}    onChange={v => setS({...s, predictiveSchedulingDays: Math.round(v)})} integer />
              <p className="text-[11px] text-ink-500 dark:text-ink-400">Set predictive scheduling to <b className="text-ink-700 dark:text-ink-300">14</b> for NYC/Seattle Fair Workweek, <b className="text-ink-700 dark:text-ink-300">7</b> for Oregon, <b className="text-ink-700 dark:text-ink-300">0</b> to disable.</p>
            </div>
            <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save rules"}</button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, v, step, onChange, integer }: { label: string; v: number; step: number; onChange: (n: number) => void; integer?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input"
        step={step}
        value={v}
        onChange={(e) => onChange(integer ? parseInt(e.target.value, 10) || 0 : parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}
