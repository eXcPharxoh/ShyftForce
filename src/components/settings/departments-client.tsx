"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Loader2, Plus, X, Trash2, Users, Sparkles } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type DeptMember = { membershipId: string; memberId: string; name: string; isPrimary: boolean };
type Dept = {
  id: string; name: string; color: string;
  locationId: string | null; locationName: string | null;
  notes: string | null; active: boolean;
  upcomingShifts: number;
  members: DeptMember[];
};

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export function DepartmentsClient({
  initial, locations, allMembers, presets,
}: {
  initial: Dept[];
  locations: { id: string; name: string }[];
  allMembers: { id: string; name: string }[];
  presets: string[];
}) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [locId, setLocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingMembers, setEditingMembers] = useState<Dept | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/departments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color, locationId: locId || null }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); r.refresh();
  }

  async function remove(d: Dept) {
    const ok = await confirm({ title: `Delete "${d.name}"?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/departments/${d.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== d.id));
  }

  async function seedPresets() {
    setBusy(true);
    for (const p of presets) {
      await fetch("/api/departments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: p, color: COLORS[presets.indexOf(p) % COLORS.length] }),
      });
    }
    setBusy(false); r.refresh();
  }

  async function attachMember(dept: Dept, memberId: string) {
    const res = await fetch(`/api/departments/${dept.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) r.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {items.length === 0 && presets.length > 0 && (
          <button onClick={seedPresets} disabled={busy} className="btn-outline text-sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Seed {presets.length} presets
          </button>
        )}
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New department</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <LayoutGrid className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No departments yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">Group your team into zones (Produce, Cashier, Apparel…) so the schedule shows coverage per section.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(d => (
            <li key={d.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold"
                  style={{ background: d.color }}
                >
                  {d.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{d.name}{d.locationName && <span className="text-ink-500 font-normal"> · {d.locationName}</span>}</div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300">
                    {d.members.length} member{d.members.length === 1 ? "" : "s"} · {d.upcomingShifts} upcoming shift{d.upcomingShifts === 1 ? "" : "s"}
                  </div>
                </div>
                <button onClick={() => setEditingMembers(d)} className="btn-ghost text-xs" title="Manage members">
                  <Users className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(d)} aria-label="Delete" className="btn-ghost text-rose-600 text-xs">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {d.members.length > 0 && (
                <div className="mt-2 ml-13 pl-3 border-l-2 flex flex-wrap gap-1.5" style={{ borderColor: d.color + "40" }}>
                  {d.members.slice(0, 12).map(m => (
                    <span key={m.membershipId} className="text-[11px] px-2 py-0.5 rounded-full bg-ink-50 dark:bg-ink-800">
                      {m.isPrimary && "★ "}{m.name}
                    </span>
                  ))}
                  {d.members.length > 12 && <span className="text-[11px] text-ink-500">+{d.members.length - 12} more</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New department</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Produce, Cashier, Apparel…" />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c} type="button" onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-lg ring-2 ${color === c ? "ring-ink-900 dark:ring-white" : "ring-transparent"}`}
                      style={{ background: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Location (optional)</label>
                <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Manage members modal */}
      {editingMembers && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingMembers(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: editingMembers.color }} />
                <span className="font-semibold text-sm">Manage: {editingMembers.name}</span>
              </div>
              <button onClick={() => setEditingMembers(null)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 overflow-y-auto">
              <ul className="space-y-1">
                {allMembers.map(m => {
                  const isMember = editingMembers.members.some(em => em.memberId === m.id);
                  return (
                    <li key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800">
                      <span className="text-sm">{m.name}</span>
                      {isMember ? (
                        <span className="text-xs text-emerald-600">✓ In department</span>
                      ) : (
                        <button onClick={() => attachMember(editingMembers, m.id)} className="btn-ghost text-xs"><Plus className="w-3.5 h-3.5" /> Add</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
