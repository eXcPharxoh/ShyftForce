"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, DollarSign, Loader2, Check, AlertTriangle } from "lucide-react";

type Balance = {
  enabled: boolean;
  availableCents: number;
  feeCentsPerWithdrawal: number;
  minWithdrawalCents: number;
  blockReason?: string | null;
  providerName?: "internal_ledger" | "branch" | "tapcheck" | "dailypay" | "stripe_treasury";
};

const PROVIDER_LABEL: Record<NonNullable<Balance["providerName"]>, string> = {
  internal_ledger: "Manager ledger (IOU)",
  branch: "Branch",
  tapcheck: "Tapcheck",
  dailypay: "DailyPay",
  stripe_treasury: "Stripe Treasury",
};

export function WithdrawModal({ balance, onClose, onDone }: { balance: Balance; onClose: () => void; onDone: () => void }) {
  const isIou = (balance.providerName ?? "internal_ledger") === "internal_ledger";
  const r = useRouter();
  const [dollars, setDollars] = useState((balance.availableCents / 100).toFixed(0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const cents = Math.max(0, Math.round(Number(dollars) * 100));
  const fee = balance.feeCentsPerWithdrawal;
  const valid = cents >= balance.minWithdrawalCents && cents <= balance.availableCents;

  async function go() {
    setBusy(true); setError(null);
    const res = await fetch("/api/ewa/withdraw", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: cents, payoutMethod: "demo" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok || !data.ok) { setError(data.error ?? data.withdrawal?.failureReason ?? "Failed"); return; }
    setDone(true);
    onDone();
    setTimeout(() => { onClose(); r.refresh(); }, 1400);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <header className="px-5 h-14 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">{isIou ? "Request advance (IOU)" : "Get paid early"}</div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">Available now: ${(balance.availableCents/100).toFixed(2)}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">$</span>
              <input
                type="number" min="0" step="1"
                value={dollars}
                onChange={(e) => setDollars(e.target.value)}
                className="input pl-7 text-lg font-bold"
              />
            </div>
            <div className="text-[11px] text-ink-500 mt-1">
              Min ${(balance.minWithdrawalCents/100).toFixed(2)} · Max ${(balance.availableCents/100).toFixed(2)} this period
            </div>
          </div>
          <div className="rounded-xl border border-ink-200 dark:border-ink-700 p-3 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-ink-600 dark:text-ink-400">You receive</span><span className="font-semibold tabular-nums">${(cents/100).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-ink-600 dark:text-ink-400">Service fee</span><span className="tabular-nums">${(fee/100).toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-ink-100 dark:border-ink-800 pt-1.5 text-ink-900 dark:text-ink-100"><span className="font-semibold">Deducted from next paycheck</span><span className="font-bold tabular-nums">${((cents+fee)/100).toFixed(2)}</span></div>
          </div>
          {isIou ? (
            <div className="text-[11px] leading-snug rounded-lg p-2.5 border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <b>No instant cash transfer.</b> This records an IOU in your employer&apos;s ledger — your manager pays you out separately (cash, Venmo, next-paycheck advance, etc.) and we subtract the amount from your next paycheck. No bank deposit happens automatically.
            </div>
          ) : (
            <div className="text-[11px] text-ink-500 dark:text-ink-400 leading-snug bg-ink-50/60 dark:bg-ink-800/60 rounded-lg p-2">
              Payout via <b>{PROVIDER_LABEL[balance.providerName ?? "internal_ledger"]}</b>. Funds typically land in 1–2 business days (instant-debit options may settle in minutes).
            </div>
          )}
          {error && <div className="text-rose-600 text-xs flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {error}</div>}
          {done && <div className="text-emerald-700 text-xs flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Request submitted!</div>}
        </div>
        <footer className="border-t border-ink-200 dark:border-ink-800 p-3 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={go} disabled={busy || !valid} className="btn-primary">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            {isIou ? `Log advance $${(cents/100).toFixed(0)}` : `Request $${(cents/100).toFixed(0)}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
