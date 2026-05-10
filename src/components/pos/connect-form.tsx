"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plug, X, Check, AlertTriangle } from "lucide-react";

type Provider = { id: "manual" | "toast" | "square" | "clover"; label: string; status: "live" | "stub" | "manual" };

export function ConnectForm({ providers, locations }: { providers: Provider[]; locations: { id: string; name: string }[] }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider["id"]>("manual");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [externalId, setExternalId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const selected = providers.find((p) => p.id === provider);

  async function submit() {
    setBusy(true); setError(null); setWarn(null);
    const res = await fetch("/api/pos/connections", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, locationId, externalId: externalId || null, accessToken: accessToken || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    if (data.ping && !data.ping.ok) {
      setWarn(data.ping.error ?? "Connected with warnings");
    }
    setOpen(false); setExternalId(""); setAccessToken("");
    r.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-xs">
        <Plug className="w-4 h-4" /> Connect POS
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Connect POS</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">Pull live sales for labor cost tracking</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Provider</label>
                <select className="input" value={provider} onChange={(e) => setProvider(e.target.value as any)}>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.label} {p.status === "stub" ? "(needs API keys)" : p.status === "manual" ? "(no integration)" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Location</label>
                <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {provider !== "manual" && (
                <>
                  <div>
                    <label className="label">{provider === "toast" ? "Restaurant GUID" : "Location ID"}</label>
                    <input className="input" value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder={provider === "toast" ? "abc-123-…" : "L1234ABCD"} />
                  </div>
                  <div>
                    <label className="label">Access token</label>
                    <input className="input font-mono text-xs" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="paste here — encrypt at rest in production" />
                  </div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400 bg-ink-50/60 dark:bg-ink-800/60 rounded-lg p-2 leading-snug">
                    For now, paste a long-lived token. Production deployment should use OAuth — see <span className="font-mono">src/lib/pos/{provider}.ts</span> for the integration shell.
                  </div>
                </>
              )}
              {provider === "manual" && (
                <div className="text-[11px] text-ink-500 dark:text-ink-400 bg-ink-50/60 dark:bg-ink-800/60 rounded-lg p-2 leading-snug">
                  No external sync. After connecting, enter daily revenue in the Live Labor view and the % vs target updates instantly.
                </div>
              )}
              {error && <div className="text-rose-600 text-xs">{error}</div>}
              {warn && <div className="text-amber-700 text-xs flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {warn}</div>}
            </div>
            <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={submit} disabled={busy || !locationId} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Connect
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
