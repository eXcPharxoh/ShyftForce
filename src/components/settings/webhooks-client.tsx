"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Webhook, Copy, CheckCircle2, AlertOctagon, Power, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

const EVENT_CATALOG = [
  { v: "shift.published",   l: "Shift published" },
  { v: "shift.created",     l: "Shift created" },
  { v: "shift.updated",     l: "Shift updated" },
  { v: "shift.deleted",     l: "Shift deleted" },
  { v: "shift.claimed",     l: "Open shift claimed" },
  { v: "shift.swapped",     l: "Shift swapped" },
  { v: "member.invited",    l: "Member invited" },
  { v: "member.joined",     l: "Member joined" },
  { v: "member.deactivated",l: "Member deactivated" },
  { v: "timesheet.approved",l: "Timesheet approved" },
  { v: "time_off.created",  l: "Time-off requested" },
  { v: "time_off.approved", l: "Time-off approved" },
  { v: "time_off.rejected", l: "Time-off rejected" },
  { v: "expense.approved",  l: "Expense approved" },
  { v: "incident.created",  l: "Incident reported" },
];

type Sub = {
  id: string; url: string; description: string | null;
  events: string[]; active: boolean; createdAt: string;
  lastDeliveryAt: string | null; lastDeliveryStatus: number | null;
  consecutiveFailures: number; disabledAt: string | null;
};

export function WebhooksClient({ initial }: { initial: Sub[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [open, setOpen]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl]         = useState("");
  const [desc, setDesc]       = useState("");
  const [events, setEvents]   = useState<string[]>(["shift.published", "time_off.approved"]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  function reset() { setUrl(""); setDesc(""); setEvents(["shift.published", "time_off.approved"]); setError(null); setCreatedSecret(null); setCopied(false); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/webhooks/subscriptions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), description: desc.trim() || null, events }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setCreatedSecret(data.secret);
    setItems(prev => [{ ...data.subscription, lastDeliveryAt: null, lastDeliveryStatus: null, consecutiveFailures: 0, disabledAt: null }, ...prev]);
    r.refresh();
  }

  async function toggleActive(s: Sub) {
    const res = await fetch(`/api/webhooks/subscriptions/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    if (res.ok) setItems(prev => prev.map(x => x.id === s.id ? { ...x, active: !s.active, disabledAt: !s.active ? null : x.disabledAt } : x));
  }

  async function remove(s: Sub) {
    const ok = await confirm({
      title: "Delete this webhook?",
      description: `Stops delivering events to ${s.url}. Existing delivery history is removed.`,
      tone: "danger", confirmLabel: "Delete webhook",
    });
    if (!ok) return;
    const res = await fetch(`/api/webhooks/subscriptions/${s.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== s.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setOpen(true); reset(); }} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add webhook
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Webhook className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No webhooks yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">Send updates to your other tools whenever shifts, time-off, or payroll events happen — works with Zapier, Make, Slack, Google Sheets, your own systems.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(s => (
            <li key={s.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.active ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-ink-100 dark:bg-ink-800 text-ink-500"}`}>
                  <Webhook className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono truncate max-w-md">{s.url}</code>
                    {!s.active && <span className="badge-gray text-[10px]">paused</span>}
                    {s.disabledAt && <span className="badge bg-rose-50 text-rose-700 text-[10px] flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> auto-disabled</span>}
                  </div>
                  {s.description && <p className="text-[11px] text-ink-500 mt-0.5">{s.description}</p>}
                  <div className="flex items-center gap-1 flex-wrap mt-2">
                    {s.events.slice(0, 6).map(e => <span key={e} className="badge-gray text-[10px]">{e}</span>)}
                    {s.events.length > 6 && <span className="text-[10px] text-ink-500">+ {s.events.length - 6}</span>}
                  </div>
                  <div className="text-[10px] text-ink-500 mt-1.5">
                    {s.lastDeliveryAt
                      ? <>Last delivery: HTTP {s.lastDeliveryStatus} at {new Date(s.lastDeliveryAt).toLocaleString()}{s.consecutiveFailures > 0 ? ` · ${s.consecutiveFailures} consecutive failure${s.consecutiveFailures === 1 ? "" : "s"}` : ""}</>
                      : "No deliveries yet"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(s)} aria-label={s.active ? "Pause webhook" : "Activate webhook"} className="btn-ghost text-xs">
                    <Power className={`w-3.5 h-3.5 ${s.active ? "text-emerald-600" : "text-ink-400"}`} />
                  </button>
                  <button onClick={() => remove(s)} aria-label="Delete webhook" className="btn-ghost text-rose-600 text-xs">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-sm">{createdSecret ? "Webhook created" : "New webhook"}</span>
              </div>
              <button type="button" onClick={() => { setOpen(false); reset(); }} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="w-4 h-4" />
              </button>
            </header>

            {createdSecret ? (
              <div className="p-5 space-y-3 overflow-y-auto">
                <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-3">
                  <div className="text-[11px] font-semibold uppercase text-amber-900 dark:text-amber-200 tracking-wider mb-2">⚠ Signing secret (shown ONCE)</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-xs bg-white dark:bg-ink-900 rounded px-2 py-1 select-all break-all">{createdSecret}</code>
                    <button type="button" onClick={async () => { await navigator.clipboard.writeText(createdSecret); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn-outline text-xs">
                      {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-2">Save this code somewhere safe — we'll only show it once. Your developer will use it to verify each message is really from us (technical: HMAC-SHA256, header <code>X-ShyftForce-Signature: sha256=&lt;hex&gt;</code>).</p>
                </div>
                <div className="text-xs text-ink-500">You'll never see this secret again. If you lose it, delete the webhook and create a new one.</div>
              </div>
            ) : (
              <div className="p-5 space-y-4 overflow-y-auto scroll-thin">
                <div>
                  <label className="label">Endpoint URL *</label>
                  <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/webhooks/shyftforce" required />
                </div>
                <div>
                  <label className="label">Description (optional)</label>
                  <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Slack integration" maxLength={200} />
                </div>
                <div>
                  <label className="label">Events ({events.length} selected)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {EVENT_CATALOG.map(e => (
                      <label key={e.v} className="flex items-center gap-2 text-xs rounded-lg border border-ink-200 dark:border-ink-800 px-2.5 py-1.5 cursor-pointer hover:bg-ink-50/40 dark:hover:bg-ink-800/40">
                        <input type="checkbox" checked={events.includes(e.v)}
                          onChange={(c) => setEvents(prev => c.target.checked ? [...prev, e.v] : prev.filter(x => x !== e.v))}
                          className="rounded text-brand-500 focus:ring-brand-500" />
                        <code className="font-mono text-[10px] text-ink-500">{e.v}</code>
                      </label>
                    ))}
                  </div>
                </div>
                {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 border border-rose-200 dark:border-rose-500/30">{error}</div>}
              </div>
            )}

            {!createdSecret && (
              <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
                <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={busy || events.length === 0 || !url.trim()} className="btn-primary">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create webhook
                </button>
              </footer>
            )}
            {createdSecret && (
              <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
                <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-primary">Done</button>
              </footer>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
