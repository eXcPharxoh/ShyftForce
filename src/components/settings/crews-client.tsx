"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HardHat, Loader2, Plus, X, Trash2, Users } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Crew = {
  id: string; name: string; color: string; notes: string | null; active: boolean;
  foremanId: string | null; foremanName: string | null;
  members: { memberId: string; name: string; role: string }[];
};

const COLORS = ["#f59e0b", "#ef4444", "#10b981", "#6366f1", "#8b5cf6", "#06b6d4"];

export function CrewsClient({ initial, allMembers }: { initial: Crew[]; allMembers: { id: string; name: string }[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [foremanId, setForemanId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingMembers, setEditingMembers] = useState<Crew | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/crews", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color, foremanId: foremanId || null }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); r.refresh();
  }

  async function remove(c: Crew) {
    const ok = await confirm({ title: `Delete crew "${c.name}"?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/crews/${c.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== c.id));
  }

  async function attachMember(crew: Crew, memberId: string) {
    const res = await fetch(`/api/crews/${crew.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role: "crew" }),
    });
    if (res.ok) r.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New crew</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <HardHat className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No crews yet</h3>
          <p className="text-sm text-ink-500 mt-1">Group workers into named crews so you can schedule and dispatch them as a unit.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(c => (
            <li key={c.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: c.color }}>
                  <HardHat className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {c.name}
                    {c.foremanName && <span className="text-ink-500 font-normal text-xs"> · Foreman: {c.foremanName}</span>}
                  </div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300">{c.members.length} member{c.members.length === 1 ? "" : "s"}</div>
                </div>
                <button onClick={() => setEditingMembers(c)} className="btn-ghost text-xs" title="Manage members">
                  <Users className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(c)} aria-label="Delete" className="btn-ghost text-rose-600 text-xs">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {c.members.length > 0 && (
                <div className="mt-2 ml-13 pl-3 border-l-2 flex flex-wrap gap-1.5" style={{ borderColor: c.color + "40" }}>
                  {c.members.map(m => (
                    <span key={m.memberId} className="text-[11px] px-2 py-0.5 rounded-full bg-ink-50 dark:bg-ink-800">{m.name}</span>
                  ))}
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
              <div className="flex items-center gap-2"><HardHat className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New crew</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Concrete Crew A" />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-lg ring-2 ${color === c ? "ring-ink-900 dark:ring-white" : "ring-transparent"}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Foreman (optional)</label>
                <select className="input" value={foremanId} onChange={(e) => setForemanId(e.target.value)}>
                  <option value="">No foreman</option>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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

      {editingMembers && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingMembers(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Users className="w-4 h-4" style={{ color: editingMembers.color }} /><span className="font-semibold text-sm">Manage: {editingMembers.name}</span></div>
              <button onClick={() => setEditingMembers(null)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 overflow-y-auto">
              <ul className="space-y-1">
                {allMembers.map(m => {
                  const isMember = editingMembers.members.some(em => em.memberId === m.id);
                  return (
                    <li key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800">
                      <span className="text-sm">{m.name}</span>
                      {isMember ? (
                        <span className="text-xs text-emerald-600">✓ In crew</span>
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
