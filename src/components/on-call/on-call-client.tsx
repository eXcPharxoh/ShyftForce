"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Loader2, Plus, X, Trash2, Sparkles, Clock } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Item = {
  id: string;
  memberId: string;
  memberName: string;
  locationName: string | null;
  startsAt: string;
  endsAt: string;
  stipendCents: number;
  calledInHours: number | null;
  calledInPremiumMultiplier: number | null;
  notes: string | null;
};

type Ranked = {
  memberId: string;
  name: string;
  onCallHoursLast60: number;
  calledInHoursLast60: number;
  lastOnCallAt: string | null;
};

function localISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OnCallClient({
  isManager, initial, members, locations,
}: {
  isManager: boolean;
  initial: Item[];
  members: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [locId, setLocId] = useState<string>("");
  const [startsAt, setStartsAt] = useState(() => localISO(new Date(Date.now() + 3600_000)));
  const [endsAt, setEndsAt] = useState(() => localISO(new Date(Date.now() + 12 * 3600_000)));
  const [stipendDollars, setStipendDollars] = useState(50);
  const [premium, setPremium] = useState(1.5);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rotation suggestor
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [ranked, setRanked] = useState<Ranked[] | null>(null);
  const [loadingRanked, setLoadingRanked] = useState(false);

  // Log called-in hours
  const [logFor, setLogFor] = useState<Item | null>(null);
  const [logHours, setLogHours] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/on-call", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        locationId: locId || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt:   new Date(endsAt).toISOString(),
        stipendCents: Math.round(stipendDollars * 100),
        calledInPremiumMultiplier: premium,
        notes: notes.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); r.refresh();
  }

  async function remove(item: Item) {
    const ok = await confirm({ title: `Remove on-call for ${item.memberName}?`, tone: "danger", confirmLabel: "Remove" });
    if (!ok) return;
    const res = await fetch(`/api/on-call/${item.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== item.id));
  }

  async function loadRotation() {
    setSuggestOpen(true);
    setLoadingRanked(true);
    const res = await fetch("/api/on-call?suggest=fair_rotation");
    const d = await res.json();
    setLoadingRanked(false);
    setRanked(d.ranked ?? []);
  }

  async function logCalledIn(e: React.FormEvent) {
    e.preventDefault();
    if (!logFor) return;
    const res = await fetch(`/api/on-call/${logFor.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calledInHours: logHours }),
    });
    if (res.ok) {
      setItems(prev => prev.map(x => x.id === logFor.id ? { ...x, calledInHours: logHours } : x));
      setLogFor(null);
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="space-y-3">
      {isManager && (
        <div className="flex justify-end gap-2">
          <button onClick={loadRotation} className="btn-outline text-sm">
            <Sparkles className="w-4 h-4" /> Fair-rotation suggestor
          </button>
          <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Schedule on-call</button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Phone className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No on-call shifts yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">
            {isManager ? "Schedule on-call windows with daily stipends and called-in premium pay." : "You don't have any on-call shifts in the last week."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(o => (
            <li key={o.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {o.memberName}
                  {o.locationName && <span className="text-ink-500 font-normal"> · {o.locationName}</span>}
                </div>
                <div className="text-[11px] text-ink-700 dark:text-ink-300">
                  {fmt(o.startsAt)} → {fmt(o.endsAt)}
                  {" · "}<b>${(o.stipendCents / 100).toFixed(0)}</b> stipend
                  {o.calledInPremiumMultiplier && ` · ×${o.calledInPremiumMultiplier} if called in`}
                </div>
                {(o.calledInHours ?? 0) > 0 && (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                    ✓ Called in {o.calledInHours}h
                  </div>
                )}
                {o.notes && <div className="text-[11px] text-ink-500 mt-0.5">{o.notes}</div>}
              </div>
              {isManager && (
                <div className="flex items-center gap-1">
                  <button onClick={() => { setLogFor(o); setLogHours(o.calledInHours ?? 0); }} className="btn-ghost text-xs" title="Log called-in hours">
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(o)} aria-label="Delete" className="btn-ghost text-rose-600 text-xs">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Schedule modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Schedule on-call</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Member</label>
                <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
                  <option value="">Pick a member…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Starts</label>
                  <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Ends</label>
                  <input className="input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Stipend ($)</label>
                  <input className="input" type="number" min={0} max={10000} value={stipendDollars} onChange={(e) => setStipendDollars(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label">Called-in ×</label>
                  <input className="input" type="number" step="0.1" min={1} max={5} value={premium} onChange={(e) => setPremium(parseFloat(e.target.value) || 1)} />
                </div>
              </div>
              <div>
                <label className="label">Location (optional)</label>
                <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Schedule
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Suggestor modal */}
      {suggestOpen && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSuggestOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Fair-rotation order (last 60 days)</span></div>
              <button onClick={() => setSuggestOpen(false)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {loadingRanked ? (
                <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : (
                <ol className="space-y-1.5">
                  {(ranked ?? []).slice(0, 20).map((m, i) => (
                    <li key={m.memberId} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                      <div className="text-[11px] text-ink-500">
                        {m.onCallHoursLast60}h on-call · {m.calledInHoursLast60}h called in
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-[11px] text-ink-500 mt-3">Ranked by fewest on-call hours, then longest time since last on-call.</p>
            </div>
          </div>
        </div>
      )}

      {/* Log called-in modal */}
      {logFor && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLogFor(null)}>
          <form onSubmit={logCalledIn} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Log called-in hours</span></div>
              <button type="button" onClick={() => setLogFor(null)} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div className="text-sm font-semibold">{logFor.memberName}</div>
              <div className="text-[11px] text-ink-500 mb-2">{fmt(logFor.startsAt)} → {fmt(logFor.endsAt)}</div>
              <div>
                <label className="label">Hours called in</label>
                <input className="input" type="number" step="0.25" min={0} max={24} value={logHours} onChange={(e) => setLogHours(parseFloat(e.target.value) || 0)} autoFocus />
              </div>
              <p className="text-[11px] text-ink-500">
                Premium pay will be calculated as <b>{logFor.calledInPremiumMultiplier ?? 1.5}× base rate</b> for these hours.
              </p>
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setLogFor(null)} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
