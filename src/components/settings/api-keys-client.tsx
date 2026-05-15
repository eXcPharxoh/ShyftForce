"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Key, Copy, CheckCircle2, Trash2, ShieldCheck } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

const SCOPES = [
  { v: "read:members",    l: "Read members" },
  { v: "write:members",   l: "Write members" },
  { v: "read:shifts",     l: "Read shifts" },
  { v: "write:shifts",    l: "Write shifts" },
  { v: "read:time_off",   l: "Read time-off" },
  { v: "write:time_off",  l: "Write time-off" },
  { v: "read:timesheets", l: "Read timesheets" },
  { v: "write:timesheets",l: "Write timesheets" },
  { v: "read:reports",    l: "Read reports" },
] as const;

type Key = {
  id: string; name: string; prefix: string; scopes: string[];
  createdAt: string; lastUsedAt: string | null; revokedAt: string | null; expiresAt: string | null;
};

export function ApiKeysClient({ initial }: { initial: Key[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems]   = useState(initial);
  const [open, setOpen]     = useState(false);
  const [name, setName]     = useState("");
  const [scopes, setScopes] = useState<string[]>(["read:shifts", "read:members"]);
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; name: string; prefix: string; scopes: string[]; fullKey: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() { setName(""); setScopes(["read:shifts", "read:members"]); setExpiresInDays(""); setError(null); setCreated(null); setCopied(false); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/settings/api-keys", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        scopes,
        expiresInDays: typeof expiresInDays === "number" ? expiresInDays : undefined,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setCreated({ ...d.key, fullKey: d.fullKey });
    setItems(prev => [{ id: d.key.id, name: d.key.name, prefix: d.key.prefix, scopes: d.key.scopes, createdAt: new Date().toISOString(), lastUsedAt: null, revokedAt: null, expiresAt: null }, ...prev]);
    r.refresh();
  }

  async function revoke(k: Key) {
    const ok = await confirm({
      title: `Revoke "${k.name}"?`,
      description: "Any code using this key will immediately get 401 responses. There's no undo.",
      tone: "danger", confirmLabel: "Revoke",
    });
    if (!ok) return;
    const res = await fetch(`/api/settings/api-keys/${k.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.map(x => x.id === k.id ? { ...x, revokedAt: new Date().toISOString() } : x));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setOpen(true); reset(); }} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New API key</button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Key className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No API keys yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">Issue a key to integrate with Zapier, your own systems, or anything that needs read/write access.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(k => (
            <li key={k.id} className="card p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                k.revokedAt ? "bg-ink-100 dark:bg-ink-800 text-ink-500" :
                "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300"
              }`}>
                <Key className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{k.name}</span>
                  {k.revokedAt && <span className="badge-gray text-[10px]">revoked</span>}
                </div>
                <div className="text-[11px] text-ink-500 font-mono mt-0.5">{k.prefix}…</div>
                <div className="flex items-center gap-1 flex-wrap mt-2">
                  {k.scopes.slice(0, 5).map(s => <span key={s} className="badge-gray text-[10px] font-mono">{s}</span>)}
                  {k.scopes.length > 5 && <span className="text-[10px] text-ink-500">+ {k.scopes.length - 5}</span>}
                </div>
                <div className="text-[10px] text-ink-500 mt-1.5">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt && <> · last used {new Date(k.lastUsedAt).toLocaleString()}</>}
                  {k.expiresAt && <> · expires {new Date(k.expiresAt).toLocaleDateString()}</>}
                </div>
              </div>
              {!k.revokedAt && (
                <button onClick={() => revoke(k)} aria-label="Revoke key" className="btn-ghost text-rose-600 text-xs">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2"><Key className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">{created ? "Key created" : "New API key"}</span></div>
              <button type="button" onClick={() => { setOpen(false); reset(); }} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>

            {created ? (
              <div className="p-5 space-y-3 overflow-y-auto">
                <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-3">
                  <div className="text-[11px] font-semibold uppercase text-amber-900 dark:text-amber-200 tracking-wider mb-2">⚠ API key (shown ONCE)</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-xs bg-white dark:bg-ink-900 rounded px-2 py-1 select-all break-all">{created.fullKey}</code>
                    <button type="button" onClick={async () => { await navigator.clipboard.writeText(created.fullKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn-outline text-xs">
                      {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-2">Send as <code>Authorization: Bearer &lt;key&gt;</code>. We can't show this again.</p>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3 overflow-y-auto scroll-thin">
                <div>
                  <label className="label">Name *</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Zapier prod" required minLength={2} />
                </div>
                <div>
                  <label className="label">Scopes ({scopes.length} selected) *</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SCOPES.map(s => (
                      <label key={s.v} className="flex items-center gap-2 text-xs rounded-lg border border-ink-200 dark:border-ink-800 px-2.5 py-1.5 cursor-pointer hover:bg-ink-50/40 dark:hover:bg-ink-800/40">
                        <input type="checkbox" checked={scopes.includes(s.v)}
                          onChange={(c) => setScopes(prev => c.target.checked ? [...prev, s.v] : prev.filter(x => x !== s.v))}
                          className="rounded text-brand-500 focus:ring-brand-500" />
                        <span><code className="text-[10px] font-mono text-ink-500">{s.v}</code></span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Expires in (optional)</label>
                  <div className="flex items-center gap-2">
                    <input className="input w-24" type="number" min={1} max={3650}
                      value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value === "" ? "" : parseInt(e.target.value))} />
                    <span className="text-sm text-ink-500">days (leave blank for no expiry)</span>
                  </div>
                </div>
                {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 border border-rose-200 dark:border-rose-500/30">{error}</div>}
              </div>
            )}
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              {created ? (
                <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-primary">Done</button>
              ) : (
                <>
                  <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={busy || name.trim().length < 2 || scopes.length === 0} className="btn-primary">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Create key
                  </button>
                </>
              )}
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
