"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Loader2, Plus, X, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CsvImportButton } from "@/components/ui/csv-import-button";

const SAMPLE_CSV = `name,category,serialNumber,notes
Generator 7500W,machine,SN-12345,Backup power
Air compressor,machine,SN-22281,
Scaffolding kit,scaffolding,,Kit A — 8 sections
Hard hats (case of 12),safety_gear,,`;

type Equipment = { id: string; name: string; category: string; serialNumber: string | null; status: string; notes: string | null; currentHolder: string | null };

const STATUS_TONE: Record<string, string> = {
  available:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  in_use:      "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  maintenance: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  retired:     "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400",
};

export function EquipmentClient({ initial }: { initial: Equipment[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"tool" | "machine" | "scaffolding" | "safety_gear" | "other">("tool");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/equipment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), category, serialNumber: serialNumber.trim() || null, notes: notes.trim() || null }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); setSerialNumber(""); setNotes(""); r.refresh();
  }

  async function setStatus(eq: Equipment, status: "available" | "maintenance" | "retired") {
    const res = await fetch(`/api/equipment/${eq.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setItems(prev => prev.map(x => x.id === eq.id ? { ...x, status } : x));
  }

  async function remove(eq: Equipment) {
    const ok = await confirm({ title: `Delete "${eq.name}"?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/equipment/${eq.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== eq.id));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <CsvImportButton
          endpoint="/api/import/equipment"
          label="Import CSV"
          title="Bulk-import equipment"
          sampleCsv={SAMPLE_CSV}
        />
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Add equipment</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Wrench className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No equipment tracked</h3>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(eq => (
            <li key={eq.id} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${STATUS_TONE[eq.status]} flex items-center justify-center shrink-0`}>
                <Wrench className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {eq.name}
                  <span className={`ml-2 text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[eq.status]}`}>{eq.status.replace("_", " ")}</span>
                  <span className="ml-2 text-ink-500 font-normal text-xs">{eq.category.replace("_", " ")}</span>
                </div>
                <div className="text-[11px] text-ink-700 dark:text-ink-300">
                  {eq.serialNumber && <>SN: <b>{eq.serialNumber}</b></>}
                  {eq.currentHolder && ` · Held by: ${eq.currentHolder}`}
                </div>
                {eq.notes && <div className="text-[11px] text-ink-500">{eq.notes}</div>}
              </div>
              <div className="flex items-center gap-1">
                {eq.status === "available" ? (
                  <button onClick={() => setStatus(eq, "maintenance")} className="btn-ghost text-amber-600 text-xs" title="Mark in maintenance">🛠️</button>
                ) : (
                  <button onClick={() => setStatus(eq, "available")} className="btn-ghost text-emerald-600 text-xs" title="Mark available">✓</button>
                )}
                <button onClick={() => remove(eq)} aria-label="Delete" className="btn-ghost text-rose-600 text-xs">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Add equipment</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Compressor #3, Scaffolding kit A…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                    <option value="tool">Tool</option>
                    <option value="machine">Machine</option>
                    <option value="scaffolding">Scaffolding</option>
                    <option value="safety_gear">Safety gear</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Serial #</label>
                  <input className="input" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} maxLength={80} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
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
    </div>
  );
}
