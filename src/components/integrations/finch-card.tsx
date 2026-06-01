"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Send, Zap } from "lucide-react";

const PROVIDER_LABELS: Record<string, string> = {
  adp_workforce_now: "ADP Workforce Now",
  adp_run:           "ADP Run",
  gusto:             "Gusto",
  paychex_flex:      "Paychex Flex",
  rippling:          "Rippling",
  quickbooks_online: "QuickBooks Online",
  workday:           "Workday",
  bamboohr:          "BambooHR",
  square_payroll:    "Square Payroll",
  wave:              "Wave",
};

export function FinchConnectCard({
  connected,
  provider,
  connectedAt,
  apiConfigured = true,
}: {
  connected: boolean;
  provider?: string | null;
  connectedAt?: string;
  /** When false, FINCH_CLIENT_ID isn't set on the server. We render the card
   *  with a disabled state + clear "Setup required" copy instead of letting
   *  customers click Connect and hit a 503. */
  apiConfigured?: boolean;
}) {
  const r = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ workersFound: number; matched: number; unmatched: any[] } | null>(null);
  const [pushResult, setPushResult] = useState<{ pushed: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setError(null); setLoading("connect");
    const res = await fetch("/api/finch/connect");
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    location.href = data.url;
  }
  async function sync() {
    setError(null); setLoading("sync"); setSyncResult(null);
    const res = await fetch("/api/finch/sync", { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? "Sync failed"); return; }
    setSyncResult(data); r.refresh();
  }
  async function pushPay() {
    setError(null); setLoading("push"); setPushResult(null);
    const res = await fetch("/api/finch/push-pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? "Push failed"); return; }
    setPushResult(data);
  }

  return (
    <section className="card p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-rose-500 text-white flex items-center justify-center shadow-soft shrink-0">
          <Zap className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight-2">Payroll & HRIS</h3>
            {connected
              ? <span className="badge-green inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</span>
              : <span className="badge-gray">Not connected</span>}
          </div>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-1 leading-relaxed">
            Connect your payroll system via <b>Finch</b> — works with <b>ADP Workforce Now / Run, Gusto, Paychex, Rippling, QuickBooks, Workday, BambooHR</b>, and 60+ more in one click.
          </p>

          {connected && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="badge-orange">{PROVIDER_LABELS[provider ?? ""] ?? provider}</span>
              {connectedAt && <span className="text-ink-500 dark:text-ink-400">connected {new Date(connectedAt).toLocaleDateString()}</span>}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {!connected && (
              <button onClick={connect} disabled={!!loading || !apiConfigured} className="btn-primary" title={!apiConfigured ? "FINCH_CLIENT_ID not set on this workspace" : undefined}>
                {loading === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Connect payroll{!apiConfigured ? " (unavailable)" : ""}
              </button>
            )}
            {connected && (
              <>
                <button onClick={sync} disabled={!!loading} className="btn-outline">
                  {loading === "sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync employees
                </button>
                <button onClick={pushPay} disabled={!!loading} className="btn-primary">
                  {loading === "push" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Push current pay period
                </button>
              </>
            )}
          </div>

          {error && <div className="mt-3 text-rose-600 dark:text-rose-400 text-xs">{error}</div>}

          {syncResult && (
            <div className="mt-4 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/40 text-xs">
              <div className="font-semibold text-ink-900 dark:text-ink-100">
                Found {syncResult.workersFound} workers · matched {syncResult.matched} to existing members · {syncResult.unmatched.length} unmatched
              </div>
              {syncResult.unmatched.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-ink-600 dark:text-ink-400 max-h-40 overflow-y-auto scroll-thin">
                  {syncResult.unmatched.slice(0, 10).map((w: any) => (
                    <li key={w.id}>· {w.name} {w.email && <span className="text-ink-400 dark:text-ink-500">({w.email})</span>}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {pushResult && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-xs text-emerald-900 dark:text-emerald-200">
              ✅ Pushed {pushResult.pushed} pay statements · skipped {pushResult.skipped} (no Finch ID){pushResult.errors.length ? ` · ${pushResult.errors.length} errors` : ""}
            </div>
          )}

          {!connected && (
            <div className="mt-5 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/40 text-[11px] text-ink-600 dark:text-ink-400">
              <b className="text-ink-700 dark:text-ink-300">Setup required:</b> Add <code className="bg-white/60 dark:bg-black/30 px-1 rounded">FINCH_CLIENT_ID</code> and <code className="bg-white/60 dark:bg-black/30 px-1 rounded">FINCH_CLIENT_SECRET</code> to your <code>.env</code> after signing up at <a href="https://dashboard.tryfinch.com/" target="_blank" rel="noopener" className="text-brand-600 dark:text-brand-400 hover:underline">dashboard.tryfinch.com</a>. Free sandbox available.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
