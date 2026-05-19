"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Loader2, Plus, X, Check } from "lucide-react";

type Item = {
  id: string; description: string; foundLocation: string | null;
  foundAt: string; status: string;
  claimedBy: string | null; claimedAt: string | null;
  notes: string | null; loggedByName: string | null;
};

const STATUS_TONE: Record<string, string> = {
  unclaimed: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  claimed:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  discarded: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400",
};

export function LostFoundClient({ initial }: { initial: Item[] }) {
  const r = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [foundLocation, setFoundLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [claimFor, setClaimFor] = useState<Item | null>(null);
  const [claimedByName, setClaimedByName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/lost-found", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description.trim(),
        foundLocation: foundLocation.trim() || null,
        notes: notes.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setDescription(""); setFoundLocation(""); setNotes(""); r.refresh();
  }

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (!claimFor) return;
    const res = await fetch("/api/lost-found", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: claimFor.id, claimedBy: claimedByName.trim(), status: "claimed" }),
    });
    if (res.ok) {
      setItems(prev => prev.map(x => x.id === claimFor.id ? { ...x, status: "claimed", claimedBy: claimedByName, claimedAt: new Date().toISOString() } : x));
      setClaimFor(null); setClaimedByName("");
    }
  }

  async function discard(item: Item) {
    const res = await fetch("/api/lost-found", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, claimedBy: "—", status: "discarded" }),
    });
    if (res.ok) setItems(prev => prev.map(x => x.id === item.id ? { ...x, status: "discarded" } : x));
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Log item</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No items logged</h3>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(i => (
            <li key={i.id} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${STATUS_TONE[i.status]} flex items-center justify-center shrink-0`}>
                <Package className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {i.description}
                  <span className={`ml-2 text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[i.status]}`}>{i.status}</span>
                </div>
                <div className="text-[11px] text-ink-700 dark:text-ink-300">
                  Found {fmt(i.foundAt)}
                  {i.foundLocation && ` · ${i.foundLocation}`}
                  {i.loggedByName && ` · by ${i.loggedByName}`}
                </div>
                {i.claimedBy && <div className="text-[11px] text-emerald-600">Claimed by {i.claimedBy} {i.claimedAt && `· ${fmt(i.claimedAt)}`}</div>}
                {i.notes && <div className="text-[11px] text-ink-500 mt-0.5">{i.notes}</div>}
              </div>
              {i.status === "unclaimed" && (
                <div className="flex items-center gap-1">
                  <button onClick={() => { setClaimFor(i); setClaimedByName(""); }} className="btn-outline text-xs"><Check className="w-3 h-3" /> Claim</button>
                  <button onClick={() => discard(i)} className="btn-ghost text-rose-600 text-xs">Discard</button>
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
              <div className="flex items-center gap-2"><Package className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Log L&amp;F item</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Description *</label>
                <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={500} placeholder="Black iPhone case with red stripe" />
              </div>
              <div>
                <label className="label">Found in</label>
                <input className="input" value={foundLocation} onChange={(e) => setFoundLocation(e.target.value)} maxLength={120} placeholder="Room 312, Lobby couch, Pool deck…" />
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
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Log
              </button>
            </footer>
          </form>
        </div>
      )}

      {claimFor && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setClaimFor(null)}>
          <form onSubmit={claim} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Claim: {claimFor.description}</span></div>
              <button type="button" onClick={() => setClaimFor(null)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Claimed by *</label>
                <input className="input" value={claimedByName} onChange={(e) => setClaimedByName(e.target.value)} required maxLength={120} placeholder="Guest name + ID checked" autoFocus />
              </div>
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setClaimFor(null)} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary"><Check className="w-4 h-4" /> Claim</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
