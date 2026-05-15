"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Tablet, Copy, CheckCircle2, Trash2, ExternalLink } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Device = { id: string; name: string; locationId: string; locationName: string; pairedAt: string; lastSeenAt: string | null };

export function KiosksClient({ initial, locations }: { initial: Device[]; locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const confirm = useConfirm();
  const [items, setItems]   = useState(initial);
  const [open, setOpen]     = useState(false);
  const [name, setName]     = useState("");
  const [locId, setLocId]   = useState(locations[0]?.id ?? "");
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [paired, setPaired] = useState<{ url: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() { setName(""); setLocId(locations[0]?.id ?? ""); setError(null); setPaired(null); setCopied(false); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/kiosk/pair", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: locId, name: name.trim() }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setPaired({ url: d.kioskUrl, token: d.token });
    setItems(prev => [{
      id: d.device.id, name: d.device.name, locationId: d.device.locationId,
      locationName: locations.find(l => l.id === d.device.locationId)?.name ?? "",
      pairedAt: new Date().toISOString(), lastSeenAt: null,
    }, ...prev]);
    r.refresh();
  }

  async function revoke(d: Device) {
    const ok = await confirm({
      title: `Revoke "${d.name}"?`,
      description: "The kiosk on this device will stop accepting clock-ins. Pair a new device to re-enable.",
      tone: "danger", confirmLabel: "Revoke",
    });
    if (!ok) return;
    const res = await fetch(`/api/kiosk/pair/${d.id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(x => x.id !== d.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setOpen(true); reset(); }} disabled={locations.length === 0} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Pair new device
        </button>
      </div>

      {locations.length === 0 && (
        <div className="card p-6 text-center text-sm text-ink-500">Add a location first under <a href="/settings/locations" className="text-brand-600 hover:underline">Settings → Locations</a> to pair a kiosk.</div>
      )}

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <Tablet className="w-10 h-10 mx-auto text-ink-300 mb-3" />
          <h3 className="font-bold">No kiosks paired yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">Pair an iPad / Android tablet at your clock-in station. Employees punch in with a 4–6 digit PIN.</p>
          <p className="text-[11px] text-ink-500 mt-2">Each member sets their own PIN at <a href="/settings/security" className="text-brand-600 hover:underline">Settings → Security</a>.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(d => (
            <li key={d.id} className="card p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                <Tablet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{d.name}</div>
                <div className="text-[11px] text-ink-500">{d.locationName} · paired {new Date(d.pairedAt).toLocaleDateString()}</div>
                <div className="text-[10px] text-ink-500 mt-1">
                  {d.lastSeenAt ? `Last clock-in ${new Date(d.lastSeenAt).toLocaleString()}` : "No clock-ins yet"}
                </div>
              </div>
              <button onClick={() => revoke(d)} aria-label="Revoke kiosk" className="btn-ghost text-rose-600 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col animate-scale-in">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2"><Tablet className="w-4 h-4 text-brand-500" /><span className="font-semibold text-sm">{paired ? "Kiosk paired" : "Pair new kiosk"}</span></div>
              <button type="button" onClick={() => { setOpen(false); reset(); }} aria-label="Close" className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>

            {paired ? (
              <div className="p-5 space-y-3 overflow-y-auto">
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-3">
                  <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 mb-2">✓ Open this URL on the tablet</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-xs bg-white dark:bg-ink-900 rounded px-2 py-1 select-all break-all">{paired.url}</code>
                    <button type="button" onClick={async () => { await navigator.clipboard.writeText(paired.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn-outline text-xs">
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-2">After opening, bookmark or Add to Home Screen. The device stays paired until you revoke it here.</p>
                </div>
                <a href={paired.url} target="_blank" rel="noopener" className="btn-outline w-full justify-center">
                  <ExternalLink className="w-3.5 h-3.5" /> Test open the kiosk
                </a>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <div>
                  <label className="label">Name *</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Front desk tablet" required minLength={2} />
                </div>
                <div>
                  <label className="label">Location *</label>
                  <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                {error && <div className="text-rose-600 text-xs bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 border border-rose-200 dark:border-rose-500/30">{error}</div>}
              </div>
            )}
            <footer className="px-5 py-3 border-t border-ink-200 dark:border-ink-800 flex justify-end gap-2 bg-ink-50/50 dark:bg-ink-900 shrink-0">
              {paired ? (
                <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-primary">Done</button>
              ) : (
                <>
                  <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={busy || name.trim().length < 2 || !locId} className="btn-primary">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Pair device
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
