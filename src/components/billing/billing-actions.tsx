"use client";
import { useState } from "react";
import { ExternalLink, CreditCard, Loader2, ArrowUpCircle, AlertCircle } from "lucide-react";

export function BillingActions({
  hasSubscription,
  currentPlan,
  stripeConfigured = true,
}: {
  hasSubscription: boolean;
  currentPlan: string;
  /** When false, Stripe isn't wired (STRIPE_SECRET_KEY unset). Upgrade
   *  buttons render disabled with an explanatory line so customers don't
   *  click and get a confusing 500 — and so we don't ship a marketing
   *  page that promises plans we can't actually charge for. */
  stripeConfigured?: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: "pro" | "business") {
    setError(null); setLoading(plan);
    const res = await fetch("/api/billing/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    location.href = data.url;
  }

  async function openPortal() {
    setError(null); setLoading("portal");
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    location.href = data.url;
  }

  if (!stripeConfigured) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-[13px] text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <b>Subscriptions aren&rsquo;t live yet.</b> Payments aren&rsquo;t configured on this workspace (Stripe keys not set), so plan upgrades are disabled. Email <a href="mailto:sales@shyftforce.com" className="underline">sales@shyftforce.com</a> to be invoiced directly, or wait until Stripe is wired up.
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {hasSubscription ? (
        <button onClick={openPortal} disabled={!!loading} className="btn-primary">
          {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Manage subscription <ExternalLink className="w-3 h-3 ml-1" />
        </button>
      ) : (
        <>
          {currentPlan !== "pro" && (
            <button onClick={() => checkout("pro")} disabled={!!loading} className="btn-outline">
              {loading === "pro" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />} Upgrade to Pro
            </button>
          )}
          {currentPlan !== "business" && (
            <button onClick={() => checkout("business")} disabled={!!loading} className="btn-primary">
              {loading === "business" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />} Upgrade to Business
            </button>
          )}
        </>
      )}
      <a href="mailto:sales@shyftforce.com?subject=Enterprise%20pricing" className="btn-ghost text-xs">Contact sales for Enterprise</a>
      {error && <div className="text-rose-600 text-xs w-full">{error}</div>}
    </div>
  );
}
