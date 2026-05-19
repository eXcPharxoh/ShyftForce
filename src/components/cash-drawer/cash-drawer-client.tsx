"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Loader2, Plus, X, CheckCircle2, AlertTriangle } from "lucide-react";

type Open = { id: string; locationName: string; openCountCents: number; openedAt: string };
type Closed = {
  id: string; memberName: string; locationName: string;
  openedAt: string; closedAt: string;
  openCountCents: number; closeCountCents: number;
  expectedCents: number | null; varianceCents: number | null; varianceReason: string | null;
};

export function CashDrawerClient({ locations, mySession, history }: { locations: { id: string; name: string }[]; mySession: Open | null; history: Closed[] }) {
  const r = useRouter();
  const [open, setOpen]     = useState(false);
  const [close, setClose]   = useState(false);
  const [locId, setLocId]   = useState(locations[0]?.id ?? "");
  const [openCount, setOpenCount]   = useState("");
  const [closeCount, setCloseCount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function doOpen(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/cash-drawer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: locId, openCountCents: Math.round(parseFloat(openCount) * 100) }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setOpenCount(""); r.refresh();
  }

  async function doClose(e: React.FormEvent) {
    e.preventDefault();
    if (!mySession) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/cash-drawer/${mySession.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        closeCountCents: Math.round(parseFloat(closeCount) * 100),
        varianceReason:  reason.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setClose(false); setCloseCount(""); setReason(""); r.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Open session card */}
      <section className="card p-5">
        {mySession ? (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-[11px] uppercase font-semibold text-brand-700 tracking-wider">Your drawer is open</div>
                <div className="text-xl font-bold mt-1">{mySession.locationName}</div>
                <div className="text-xs text-ink-500 mt-1">
                  Opened {new Date(mySession.openedAt).toLocaleString()} ·
                  Started with <b>${(mySession.openCountCents / 100).toFixed(2)}</b>
                </div>
              </div>
              <button onClick={() => setClose(true)} className="btn-primary">
                <Banknote className="w-4 h-4" /> Close drawer
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider">No open session</div>
              <p className="text-sm text-ink-700 dark:text-ink-300 mt-1">Count your drawer at the start of your shift, then open a session to track it.</p>
            </div>
            <button onClick={() => setOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Open new drawer
            </button>
          </div>
        )}
      </section>

      {/* History */}
      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
          <h3 className="text-sm font-semibold">Recent sessions</h3>
        </header>
        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">No closed sessions yet.</div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {history.map(s => {
              const isOver  = s.varianceCents != null && s.varianceCents > 100;
              const isShort = s.varianceCents != null && s.varianceCents < -100;
              return (
                <li key={s.id} className="px-5 py-3 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isShort ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                    : isOver ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  }`}>
                    {(isShort || isOver) ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{s.memberName} · {s.locationName}</div>
                    <div className="text-[11px] text-ink-500">
                      {new Date(s.openedAt).toLocaleString()} → {new Date(s.closedAt).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-ink-700 dark:text-ink-300 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Open: <b>${(s.openCountCents / 100).toFixed(2)}</b></span>
                      <span>Close: <b>${(s.closeCountCents / 100).toFixed(2)}</b></span>
                      {s.expectedCents != null && <span>Expected: ${(s.expectedCents / 100).toFixed(2)}</span>}
                      {s.varianceCents != null && (
                        <span className={isShort ? "text-rose-600 font-semibold" : isOver ? "text-amber-700 font-semibold" : ""}>
                          Variance: {s.varianceCents >= 0 ? "+" : ""}${(s.varianceCents / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {s.varianceReason && <div className="text-[11px] text-ink-500 mt-1 italic">{s.varianceReason}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Open modal */}
      {open && (
        <Modal title="Open new drawer" icon={Plus} onClose={() => setOpen(false)}>
          <form onSubmit={doOpen} className="p-5 space-y-3">
            <div>
              <label className="label">Location *</label>
              <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Starting cash count ($) *</label>
              <input className="input" type="number" min={0} step="0.01" value={openCount} onChange={(e) => setOpenCount(e.target.value)} placeholder="100.00" required autoFocus />
              <p className="text-[11px] text-ink-500 mt-1">Count every bill + coin in the drawer before any sales happen.</p>
            </div>
            {error && <div className="text-rose-600 text-xs">{error}</div>}
            <ModalFooter onCancel={() => setOpen(false)} busy={busy} cta="Open drawer" />
          </form>
        </Modal>
      )}

      {/* Close modal */}
      {close && mySession && (
        <Modal title={`Close drawer at ${mySession.locationName}`} icon={Banknote} onClose={() => setClose(false)}>
          <form onSubmit={doClose} className="p-5 space-y-3">
            <div className="rounded-lg bg-ink-50 dark:bg-ink-800 p-3 text-xs">
              Opened {new Date(mySession.openedAt).toLocaleString()} with <b>${(mySession.openCountCents / 100).toFixed(2)}</b>
            </div>
            <div>
              <label className="label">Closing cash count ($) *</label>
              <input className="input" type="number" min={0} step="0.01" value={closeCount} onChange={(e) => setCloseCount(e.target.value)} placeholder="538.50" required autoFocus />
            </div>
            <div>
              <label className="label">Variance reason (if any)</label>
              <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer overpaid, tipped manager directly" maxLength={500} />
            </div>
            {error && <div className="text-rose-600 text-xs">{error}</div>}
            <ModalFooter onCancel={() => setClose(false)} busy={busy} cta="Close drawer" />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, icon: Icon, onClose, children }: { title: string; icon: any; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
        <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
          <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">{title}</span></div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, busy, cta }: { onCancel: () => void; busy: boolean; cta: string }) {
  return (
    <footer className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {cta}
      </button>
    </footer>
  );
}
