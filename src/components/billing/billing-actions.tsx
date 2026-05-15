"use client";
import { useState } from "react";
import { ExternalLink, CreditCard, Loader2, ArrowUpCircle } from "lucide-react";

export function BillingActions({ hasSubscription, currentPlan }: { hasSubscription: boolean; currentPlan: string }) {
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
