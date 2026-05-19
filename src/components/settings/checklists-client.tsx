"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, ListChecks, Trash2, Camera, MessageSquare } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Item = { id?: string; text: string; requiresPhoto: boolean; requiresNote: boolean };
type Template = {
  id: string; name: string; trigger: string; requireCompletion: boolean;
  locationId: string | null; locationName: string | null;
  items: Item[]; positions: string[] | null;
};
type Loc = { id: string; name: string };

const STARTER_TEMPLATES: { name: string; trigger: "pre_shift" | "post_shift"; items: Item[] }[] = [
  {
    name: "Opening side work (server)",
    trigger: "pre_shift",
    items: [
      { text: "Roll silverware (50 sets minimum)", requiresPhoto: false, requiresNote: false },
      { text: "Restock sugar caddies + condiments", requiresPhoto: false, requiresNote: false },
      { text: "Wipe down all tables + booths", requiresPhoto: false, requiresNote: false },
      { text: "Check + restock to-go area", requiresPhoto: false, requiresNote: false },
    ],
  },
  {
    name: "Closing kitchen (line cook)",
    trigger: "post_shift",
    items: [
      { text: "Cover + label all open prep containers", requiresPhoto: true, requiresNote: false },
      { text: "Walk-in cooler temp logged", requiresPhoto: false, requiresNote: true },
      { text: "Grill + flat-top fully cleaned", requiresPhoto: true, requiresNote: false },
      { text: "All trash taken out", requiresPhoto: false, requiresNote: false },
      { text: "Floor swept + mopped", requiresPhoto: true, requiresNote: false },
    ],
  },
];

export function ChecklistsClient({ initial, locations }: { initial: Template[]; locations: Loc[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen]   = useState(false);
  const [name, setName]   = useState("");
  const [trigger, setTrigger] = useState<"pre_shift" | "post_shift" | "manual">("post_shift");
  const [requireCompletion, setRequireCompletion] = useState(true);
  const [locId, setLocId] = useState<string>("");
  const [tplItems, setTplItems] = useState<Item[]>([{ text: "", requiresPhoto: false, requiresNote: false }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadStarter(s: typeof STARTER_TEMPLATES[number]) {
    setName(s.name); setTrigger(s.trigger); setTplItems(s.items.map(i => ({ ...i })));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = tplItems.filter(i => i.text.trim().length >= 2);
    if (validItems.length === 0) { setError("Add at least one item"); return; }
    setBusy(true); setError(null);
    const res = await fetch("/api/checklists/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(), trigger, requireCompletion,
        locationId: locId || null,
        items: validItems,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); setTplItems([{ text: "", requiresPhoto: false, requiresNote: false }]);
    r.refresh();
  }

  async function remove(t: Template) {
    const ok = await confirm({ title: `Archive "${t.name}"?`, tone: "danger", confirmLabel: "Archive" });
    if (!ok) return;
    const res = await fetch(`/api/checklists/templates/${t.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== t.id));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New checklist</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <ListChecks className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No checklists yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">Build opening + closing side-work lists, kitchen line checks, safety walks. Required ones block clock-out until done.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(t => (
            <li key={t.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-[11px] text-ink-500">
                    {t.trigger.replace("_", " ")} · {t.items.length} item{t.items.length === 1 ? "" : "s"}
                    {t.locationName && ` · ${t.locationName}`}
                    {t.requireCompletion && " · blocks clock-out"}
                  </div>
                </div>
                <button onClick={() => remove(t)} aria-label="Archive" className="btn-ghost text-rose-600 text-xs">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2"><ListChecks className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">New checklist</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3 overflow-y-auto scroll-thin">
              <div>
                <label className="label">Starter templates</label>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_TEMPLATES.map(s => (
                    <button type="button" key={s.name} onClick={() => loadStarter(s)} className="btn-outline text-xs">{s.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Closing kitchen" required minLength={2} maxLength={120} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">When</label>
                  <select className="input" value={trigger} onChange={(e) => setTrigger(e.target.value as any)}>
                    <option value="pre_shift">Pre-shift (clock in)</option>
                    <option value="post_shift">Post-shift (before clock-out)</option>
                    <option value="manual">Manual (employee starts it)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Location (optional)</label>
                  <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                    <option value="">All locations</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={requireCompletion} onChange={(e) => setRequireCompletion(e.target.checked)} className="rounded text-brand-500" />
                <span>Block clock-out until done (required for compliance)</span>
              </label>
              <div className="pt-2 border-t border-ink-100 dark:border-ink-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="label !mb-0">Items ({tplItems.length})</label>
                  <button type="button" onClick={() => setTplItems(p => [...p, { text: "", requiresPhoto: false, requiresNote: false }])} className="btn-outline text-xs"><Plus className="w-3 h-3" /> Add</button>
                </div>
                <ul className="space-y-2">
                  {tplItems.map((item, i) => (
                    <li key={i} className="rounded-xl border border-ink-200 dark:border-ink-800 p-2.5">
                      <input className="input" value={item.text} onChange={(e) => setTplItems(p => p.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} placeholder={`Item ${i + 1}`} maxLength={280} />
                      <div className="flex items-center gap-3 mt-2 text-[11px]">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={item.requiresPhoto} onChange={(e) => setTplItems(p => p.map((x, j) => j === i ? { ...x, requiresPhoto: e.target.checked } : x))} className="rounded text-brand-500" />
                          <Camera className="w-3 h-3" /> Photo required
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={item.requiresNote} onChange={(e) => setTplItems(p => p.map((x, j) => j === i ? { ...x, requiresNote: e.target.checked } : x))} className="rounded text-brand-500" />
                          <MessageSquare className="w-3 h-3" /> Note required
                        </label>
                        {tplItems.length > 1 && (
                          <button type="button" onClick={() => setTplItems(p => p.filter((_, j) => j !== i))} className="ml-auto btn-ghost text-rose-600 text-xs">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || !name.trim()} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
