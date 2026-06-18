"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Loader2, X, Save, Trash2, PlayCircle, Layers } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toaster";

type Tpl = { id: string; name: string; description: string | null; shiftCount: number; createdAt: string; updatedAt: string };

export function TemplatesButton({ weekStart }: { weekStart: string }) {
  const r = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen]    = useState(false);
  const [items, setItems]  = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy]    = useState<string | null>(null);

  // Save modal state
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/schedule/templates").then(r => r.json()).then(d => { setItems(d.items ?? []); setLoading(false); });
  }, [open]);

  async function saveCurrent(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    const res = await fetch("/api/schedule/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName.trim(), description: saveDesc.trim() || null, weekStart }),
    });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) { toast.error("Couldn't save template", { description: d.error ?? "Try again." }); return; }
    setItems(prev => [{ id: d.template.id, name: d.template.name, description: null, shiftCount: d.template.shiftCount, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev]);
    setSaveOpen(false); setSaveName(""); setSaveDesc("");
    toast.success(`Saved "${d.template.name}"`, { description: `${d.template.shiftCount} shifts captured.` });
  }

  async function applyTemplate(t: Tpl, publish: boolean) {
    const ok = await confirm({
      title: `Apply "${t.name}" to this week?`,
      description: `${t.shiftCount} shifts will be created${publish ? " as published" : " as drafts"}. Conflicts skipped automatically.`,
      confirmLabel: publish ? "Apply & publish" : "Apply as draft",
    });
    if (!ok) return;
    setBusy(t.id);
    const res = await fetch(`/api/schedule/templates/${t.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, publish, skipConflicts: true }),
    });
    const d = await res.json();
    setBusy(null); setOpen(false);
    if (!res.ok) { toast.error("Couldn't apply template", { description: d.error ?? "Try again." }); return; }
    toast.success(`Created ${d.created} shifts`, { description: d.skipped > 0 ? `${d.skipped} skipped due to conflicts.` : undefined });
    r.refresh();
  }

  async function deleteTemplate(t: Tpl) {
    const ok = await confirm({ title: `Delete template "${t.name}"?`, tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    setBusy(t.id);
    const res = await fetch(`/api/schedule/templates/${t.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) {
      setItems(prev => prev.filter(x => x.id !== t.id));
      toast.success("Template deleted");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost btn-sm"
        title="Templates — save or apply a saved week"
        aria-label="Templates"
      >
        <Layers className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Schedule templates</span></div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>

            <div className="p-5 overflow-y-auto scroll-thin space-y-3">
              <button onClick={() => setSaveOpen(true)} className="w-full btn-outline justify-start py-2.5">
                <BookmarkPlus className="w-4 h-4" /> Save this week as a template…
              </button>

              {loading ? (
                <div className="text-center py-8 text-sm text-ink-500"><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading…</div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-sm text-ink-500">No templates yet. Save your current week to start a library.</div>
              ) : (
                <ul className="space-y-2">
                  {items.map(t => (
                    <li key={t.id} className="rounded-xl border border-ink-200 dark:border-ink-800 p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0"><Layers className="w-5 h-5" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{t.name}</div>
                          {t.description && <p className="text-[11px] text-ink-500 mt-0.5">{t.description}</p>}
                          <div className="text-[10px] text-ink-500 mt-0.5">{t.shiftCount} shift{t.shiftCount === 1 ? "" : "s"} · saved {new Date(t.updatedAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => applyTemplate(t, false)} disabled={busy === t.id} className="btn-outline text-xs">
                            {busy === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />} Apply
                          </button>
                          <button onClick={() => deleteTemplate(t)} aria-label="Delete template" className="btn-ghost text-rose-600 text-xs">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save modal — nested */}
      {saveOpen && (
        <div className="fixed inset-0 z-[60] bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setSaveOpen(false)}>
          <form onSubmit={saveCurrent} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><BookmarkPlus className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Save as template</span></div>
              <button type="button" onClick={() => setSaveOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Summer Saturday" required minLength={2} maxLength={80} />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input className="input" value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} placeholder="Patio + dinner rush staffing" maxLength={500} />
              </div>
              <p className="text-[11px] text-ink-500">Snapshots every shift on the currently-viewed week. Apply later to any other week.</p>
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setSaveOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy === "save" || saveName.trim().length < 2} className="btn-primary">
                {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save template
              </button>
            </footer>
          </form>
        </div>
      )}

    </>
  );
}
