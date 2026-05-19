"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Plus, X, LogOut } from "lucide-react";

type Visitor = {
  id: string; name: string; company: string | null; badgeNumber: string | null; purpose: string | null;
  checkedInAt: string; checkedOutAt: string | null;
  hostName: string; hostMemberId: string;
};

export function VisitorsClient({ initial, members }: { initial: Visitor[]; members: { id: string; name: string }[] }) {
  const r = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [hostId, setHostId] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/visitors", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(), company: company.trim() || null,
        hostMemberId: hostId, badgeNumber: badgeNumber.trim() || null,
        purpose: purpose.trim() || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); setName(""); setCompany(""); setBadgeNumber(""); setPurpose(""); r.refresh();
  }

  async function checkOut(v: Visitor) {
    const res = await fetch("/api/visitors", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: v.id }),
    });
    if (res.ok) {
      setItems(prev => prev.map(x => x.id === v.id ? { ...x, checkedOutAt: new Date().toISOString() } : x));
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  const onSite = items.filter(v => !v.checkedOutAt);
  const past = items.filter(v => v.checkedOutAt);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Sign in visitor</button>
      </div>

      {onSite.length > 0 && (
        <section>
          <h3 className="text-xs uppercase font-semibold tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">On site now</h3>
          <ul className="space-y-2">
            {onSite.map(v => (
              <li key={v.id} className="card p-4 flex items-center gap-3 ring-1 ring-emerald-200 dark:ring-emerald-500/30">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{v.name}{v.company && <span className="text-ink-500 font-normal"> · {v.company}</span>}</div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300">
                    Host: {v.hostName} · In at {fmt(v.checkedInAt)}
                    {v.badgeNumber && ` · Badge #${v.badgeNumber}`}
                  </div>
                  {v.purpose && <div className="text-[11px] text-ink-500 mt-0.5">{v.purpose}</div>}
                </div>
                <button onClick={() => checkOut(v)} className="btn-outline text-xs"><LogOut className="w-3.5 h-3.5" /> Sign out</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h3 className="text-xs uppercase font-semibold tracking-wider text-ink-500 mb-2">Past visits</h3>
          <ul className="space-y-1.5">
            {past.map(v => (
              <li key={v.id} className="card p-3 flex items-center gap-3 opacity-75">
                <div className="w-8 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-500 flex items-center justify-center shrink-0 text-xs">
                  {v.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{v.name}{v.company && ` · ${v.company}`}</div>
                  <div className="text-[11px] text-ink-500">Host: {v.hostName} · {fmt(v.checkedInAt)} → {v.checkedOutAt && fmt(v.checkedOutAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {items.length === 0 && (
        <div className="card p-12 text-center">
          <UserPlus className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No visitors logged</h3>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">Sign in visitor</span></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoFocus />
              </div>
              <div>
                <label className="label">Company</label>
                <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
              </div>
              <div>
                <label className="label">Host *</label>
                <select className="input" value={hostId} onChange={(e) => setHostId(e.target.value)} required>
                  <option value="">Pick a host…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Badge #</label>
                  <input className="input" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} maxLength={40} />
                </div>
                <div>
                  <label className="label">Purpose</label>
                  <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={200} placeholder="Meeting, interview…" />
                </div>
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Sign in
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
