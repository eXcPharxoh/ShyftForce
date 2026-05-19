"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, ShieldAlert, AlertOctagon, AlertTriangle, CheckCircle2, ExternalLink, Trash2, Calendar, DollarSign } from "lucide-react";
// (Loader2 + Calendar + DollarSign are used in the modal body)
import { useConfirm } from "@/components/ui/confirm-dialog";

type Permit = {
  id: string;
  category: string;
  customLabel: string | null;
  regulator: string | null;
  permitNumber: string | null;
  expiresOn: string;
  feeAmountCents: number | null;
  renewalUrl: string | null;
  blocksScheduling: boolean;
  memberId: string | null;
  memberName: string | null;
  daysUntilExpiry: number;
  status: "ok" | "expiring_soon" | "expiring_urgent" | "expired";
};

type CatalogItem = {
  key: string; label: string; level: "agency" | "member";
  description: string; vertical: string;
  defaultFeeCents?: number;
  hintRegulator?: string;
  hintRenewalUrl?: string;
};

type Member = { id: string; name: string };

export function PermitsClient({ initial, members, catalog }: { initial: Permit[]; members: Member[]; catalog: CatalogItem[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen]   = useState(false);
  const [tab, setTab]     = useState<"all" | "agency" | "member">("all");

  // Form state
  const [category, setCategory]     = useState<string>("guard_license");
  const [customLabel, setCustomLabel] = useState("");
  const [memberId, setMemberId]     = useState<string>("");
  const [permitNumber, setPermitNumber] = useState("");
  const [regulator, setRegulator]   = useState("");
  const [renewalUrl, setRenewalUrl] = useState("");
  const [issuedOn, setIssuedOn]     = useState("");
  const [expiresOn, setExpiresOn]   = useState("");
  const [feeUsd, setFeeUsd]         = useState<string>("");
  const [blocks, setBlocks]         = useState(true);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCat = catalog.find(c => c.key === category);

  function reset() {
    setCategory("guard_license");
    setCustomLabel(""); setMemberId(""); setPermitNumber("");
    setRegulator(""); setRenewalUrl(""); setIssuedOn(""); setExpiresOn(""); setFeeUsd("");
    setBlocks(true); setError(null); setBusy(false);
  }

  function pickCategory(key: string) {
    setCategory(key);
    const c = catalog.find(x => x.key === key);
    setRegulator(c?.hintRegulator ?? "");
    setRenewalUrl(c?.hintRenewalUrl ?? "");
    if (c?.defaultFeeCents) setFeeUsd((c.defaultFeeCents / 100).toFixed(0));
    if (c?.level === "agency") setMemberId("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/permits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        customLabel: category === "custom" ? customLabel.trim() : null,
        memberId: selectedCat?.level === "agency" ? null : (memberId || null),
        regulator: regulator.trim() || null,
        permitNumber: permitNumber.trim() || null,
        issuedOn: issuedOn ? new Date(issuedOn + "T00:00:00").toISOString() : null,
        expiresOn: new Date(expiresOn + "T23:59:59").toISOString(),
        feeAmountCents: feeUsd ? Math.round(parseFloat(feeUsd) * 100) : null,
        renewalUrl: renewalUrl.trim() || null,
        blocksScheduling: blocks,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setOpen(false); reset(); r.refresh();
  }

  async function remove(p: Permit) {
    const ok = await confirm({
      title: `Delete this permit?`,
      description: "Reminder history goes with it. There's no undo.",
      tone: "danger", confirmLabel: "Delete permit",
    });
    if (!ok) return;
    const res = await fetch(`/api/permits/${p.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== p.id));
  }

  async function renew(p: Permit) {
    // Quick renewal: bumps expiresOn forward by 1 year and resets reminders.
    const newExpiry = new Date(p.expiresOn);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    const ok = await confirm({
      title: "Renew for 1 year?",
      description: `New expiry: ${newExpiry.toLocaleDateString()}. Reminder cadence will fire fresh.`,
      confirmLabel: "Renew permit",
    });
    if (!ok) return;
    const res = await fetch(`/api/permits/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresOn: newExpiry.toISOString(), resetReminders: true }),
    });
    if (res.ok) r.refresh();
  }

  const visible = items.filter(p =>
    tab === "all" ? true :
    tab === "agency" ? p.memberId === null :
    p.memberId !== null
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-ink-100 dark:bg-ink-800">
          <TabBtn active={tab === "all"}    onClick={() => setTab("all")}>All ({items.length})</TabBtn>
          <TabBtn active={tab === "agency"} onClick={() => setTab("agency")}>Agency ({items.filter(p => !p.memberId).length})</TabBtn>
          <TabBtn active={tab === "member"} onClick={() => setTab("member")}>Per-employee ({items.filter(p => p.memberId).length})</TabBtn>
        </div>
        <button onClick={() => { setOpen(true); reset(); }} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add permit
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="card p-12 text-center">
          <ShieldAlert className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No permits in this view</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">
            Add the agency licence + each guard's individual permit. We'll auto-remind everyone before expiry and lock expired guards out of new shifts.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map(p => (
            <li key={p.id} className={`card p-4 ${rowToneFor(p.status)}`}>
              <div className="flex items-start gap-3">
                <SeverityBadge status={p.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {p.category === "custom" ? p.customLabel : catalog.find(c => c.key === p.category)?.label ?? p.category}
                    </span>
                    {!p.memberId && <span className="badge-orange text-[10px]">agency-level</span>}
                    {p.blocksScheduling && <span className="badge bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 text-[10px]">blocks scheduling</span>}
                  </div>
                  <div className="text-[11px] text-ink-700 dark:text-ink-300 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {p.memberName && <span><b>{p.memberName}</b></span>}
                    {p.regulator && <span>📋 {p.regulator}</span>}
                    {p.permitNumber && <span>#{p.permitNumber}</span>}
                    {p.feeAmountCents != null && <span>💵 ${(p.feeAmountCents / 100).toLocaleString()}/yr</span>}
                  </div>
                  <div className="text-[11px] mt-1.5">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {p.status === "expired" ? (
                      <span className="text-rose-600 font-semibold">EXPIRED on {new Date(p.expiresOn).toLocaleDateString()} ({-p.daysUntilExpiry}d ago)</span>
                    ) : p.daysUntilExpiry === 0 ? (
                      <span className="text-rose-600 font-semibold">Expires TODAY</span>
                    ) : (
                      <span className={p.daysUntilExpiry <= 7 ? "text-rose-600 font-semibold" : p.daysUntilExpiry <= 30 ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-ink-500"}>
                        {p.daysUntilExpiry} day{p.daysUntilExpiry === 1 ? "" : "s"} left · {new Date(p.expiresOn).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.renewalUrl && (
                    <a href={p.renewalUrl} target="_blank" rel="noopener" aria-label="Open regulator portal" className="btn-ghost text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => renew(p)} className="btn-outline text-xs">+1yr</button>
                  <button onClick={() => remove(p)} aria-label="Delete permit" className="btn-ghost text-rose-600 text-xs">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add permit modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-sm">New permit / licence</span>
              </div>
              <button type="button" onClick={() => { setOpen(false); reset(); }} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 space-y-4 overflow-y-auto scroll-thin">
              {/* Category picker */}
              <div>
                <label className="label">Type *</label>
                <select className="input" value={category} onChange={(e) => pickCategory(e.target.value)}>
                  <optgroup label="Security">
                    {catalog.filter(c => c.vertical === "security").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                  <optgroup label="Healthcare">
                    {catalog.filter(c => c.vertical === "healthcare").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                  <optgroup label="Restaurant / hospitality">
                    {catalog.filter(c => c.vertical === "restaurant").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                  <optgroup label="Field service / transport">
                    {catalog.filter(c => c.vertical === "field_service").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                  <optgroup label="Other">
                    {catalog.filter(c => c.vertical === "any").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                </select>
                {selectedCat && <p className="text-[11px] text-ink-500 mt-1">{selectedCat.description}</p>}
              </div>

              {category === "custom" && (
                <div>
                  <label className="label">Custom label *</label>
                  <input className="input" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="e.g. Forklift certification" required maxLength={120} />
                </div>
              )}

              {selectedCat?.level === "member" && (
                <div>
                  <label className="label">Held by *</label>
                  <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)} required={selectedCat.level === "member"}>
                    <option value="">— Pick a team member —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Regulator / issuer</label>
                  <input className="input" value={regulator} onChange={(e) => setRegulator(e.target.value)} placeholder="Bureau de la sécurité privée" maxLength={200} />
                </div>
                <div>
                  <label className="label">Permit number</label>
                  <input className="input" value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} placeholder="123456" maxLength={120} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Issued on</label>
                  <input className="input" type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
                </div>
                <div>
                  <label className="label">Expires on *</label>
                  <input className="input" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1"><DollarSign className="w-3 h-3" /> Annual fee (USD)</label>
                  <input className="input" type="number" min={0} step="0.01" value={feeUsd} onChange={(e) => setFeeUsd(e.target.value)} placeholder="182" />
                </div>
                <div>
                  <label className="label">Renewal URL</label>
                  <input className="input" type="url" value={renewalUrl} onChange={(e) => setRenewalUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm rounded-lg border border-ink-200 dark:border-ink-800 p-3 cursor-pointer">
                <input type="checkbox" checked={blocks} onChange={(e) => setBlocks(e.target.checked)} className="mt-0.5 rounded text-brand-500 focus:ring-brand-500" />
                <span>
                  <span className="font-semibold">Block scheduling when expired</span>
                  <span className="block text-[11px] text-ink-500">Required for security guard licences. Disable for optional certs.</span>
                </span>
              </label>

              {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 border border-rose-200 dark:border-rose-500/30">{error}</div>}
            </div>

            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy || !expiresOn} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {busy ? "Saving…" : "Add permit"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
      active ? "bg-white dark:bg-ink-900 shadow-sm text-ink-900 dark:text-ink-50" : "text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100"
    }`}>{children}</button>
  );
}

function SeverityBadge({ status }: { status: string }) {
  if (status === "expired")         return <div className="shrink-0 w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center"><AlertOctagon className="w-5 h-5" /></div>;
  if (status === "expiring_urgent") return <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>;
  if (status === "expiring_soon")   return <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center"><ShieldAlert className="w-5 h-5" /></div>;
  return <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>;
}

function rowToneFor(status: string): string {
  if (status === "expired")         return "border-rose-200 dark:border-rose-500/30";
  if (status === "expiring_urgent") return "border-amber-200 dark:border-amber-500/30";
  return "";
}
