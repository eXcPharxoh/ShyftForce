"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, X } from "lucide-react";

export function PostToNetworkButton({ shiftId, label = "Post to network" }: { shiftId: string; label?: string }) {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [payoutType, setPayoutType] = useState<"w2" | "1099">("1099");
  const [rate, setRate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true); setError(null);
    const res = await fetch("/api/network/post", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shiftId, payoutType,
        payRateOverrideCents: rate ? Math.round(Number(rate) * 100) : null,
        message: message || null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setOpen(false);
    r.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline text-xs">
        <Globe className="w-3.5 h-3.5" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Post to network</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">Discoverable workers from other employers can claim this shift</div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Engagement type</label>
                <div className="flex gap-2">
                  <button onClick={() => setPayoutType("1099")} className={`text-xs px-3 py-1.5 rounded-full border transition flex-1 ${payoutType === "1099" ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold" : "border-ink-200 dark:border-ink-700"}`}>1099 contractor</button>
                  <button onClick={() => setPayoutType("w2")} className={`text-xs px-3 py-1.5 rounded-full border transition flex-1 ${payoutType === "w2" ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold" : "border-ink-200 dark:border-ink-700"}`}>W-2 cross-employer</button>
                </div>
              </div>
              <div>
                <label className="label">Override hourly rate (USD, optional)</label>
                <input className="input" type="number" step="0.50" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="leave blank to use shift's default" />
              </div>
              <div>
                <label className="label">Message to claimants (optional)</label>
                <textarea className="input min-h-[68px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. busy Friday — looking for experienced server, all tips kept" />
              </div>
              {error && <div className="text-rose-600 text-xs">{error}</div>}
            </div>
            <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={go} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} Post
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
