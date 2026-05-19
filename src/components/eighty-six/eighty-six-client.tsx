"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Ban, RefreshCw, Wine, Utensils, Beer, GlassWater } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type Item = { id: string; name: string; category: string | null; notes: string | null; locationId: string; locationName: string; markedAt: string };
type Loc = { id: string; name: string };

const CAT_ICON: Record<string, any> = { food: Utensils, drink: GlassWater, wine: Wine, beer: Beer, cocktail: GlassWater, other: Ban };
const CAT_TONE: Record<string, string> = {
  food: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  drink: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  wine: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  beer: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  cocktail: "bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  other: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300",
};

export function EightySixClient({ isManager, initialItems, locations }: { isManager: boolean; initialItems: Item[]; locations: Loc[] }) {
  const r = useRouter();
  const [items, setItems] = useState(initialItems);
  const [open, setOpen]   = useState(false);
  const [name, setName]   = useState("");
  const [category, setCategory] = useState<string>("food");
  const [locId, setLocId] = useState(locations[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [notifySms, setNotifySms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/eighty-six", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: locId, name: name.trim(), category, notes: notes.trim() || null, notifyOnDutyBySms: notifySms }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setItems(prev => [{
      id: d.item.id, name: d.item.name, category: d.item.category, notes: d.item.notes,
      locationId: d.item.locationId, locationName: locations.find(l => l.id === d.item.locationId)?.name ?? "",
      markedAt: new Date().toISOString(),
    }, ...prev]);
    setOpen(false); setName(""); setNotes("");
    r.refresh();
  }

  async function unmark(it: Item) {
    const res = await fetch(`/api/eighty-six/${it.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== it.id));
  }

  return (
    <div className="space-y-4">
      {isManager && (
        <div className="flex justify-end">
          <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> 86 an item</button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon={Ban} title="Nothing 86'd right now" description="When kitchen runs out, mark it here — every server on duty gets a push instantly." />
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map(it => {
            const Icon = CAT_ICON[it.category ?? "other"] ?? Ban;
            const tone = CAT_TONE[it.category ?? "other"];
            return (
              <li key={it.id} className="card p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base">{it.name}</div>
                  <div className="text-[11px] text-ink-500">{it.locationName} · {new Date(it.markedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                  {it.notes && <p className="text-xs text-ink-700 dark:text-ink-300 mt-1">{it.notes}</p>}
                </div>
                {isManager && (
                  <button onClick={() => unmark(it)} aria-label="Item is back" className="btn-outline text-xs">
                    <RefreshCw className="w-3.5 h-3.5" /> Back on
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Ban className="w-4 h-4 text-rose-500" /><span className="font-semibold text-sm">86 an item</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Item *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bone-in ribeye" required minLength={1} maxLength={120} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="food">Food</option>
                    <option value="drink">Drink</option>
                    <option value="wine">Wine</option>
                    <option value="beer">Beer</option>
                    <option value="cocktail">Cocktail</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Location</label>
                  <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes (shown to servers)</label>
                <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ETA back: tomorrow lunch" maxLength={500} />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} className="rounded text-brand-500" />
                <span>Also text on-duty servers (uses SMS credits)</span>
              </label>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || !name.trim()} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} 86 it
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
