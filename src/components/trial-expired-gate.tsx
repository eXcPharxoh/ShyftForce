"use client";

import { useState } from "react";
import { Bolt } from "@/components/ui/logo";
import { ArrowRight, Loader2, Check } from "lucide-react";

/**
 * Trial-expired hard gate.
 *
 * When the org's trial has ended AND there's no active Stripe subscription,
 * we render a full-screen modal that blocks the dashboard until the manager
 * either picks a plan (→ Stripe Checkout) or contacts sales for enterprise.
 *
 * Mounted from (app)/layout.tsx — server decides whether to render based on
 * `effectivePlanKey(org)` + Stripe status.
 */
export function TrialExpiredGate({
  daysExpired,
  activeMembers,
}: {
  daysExpired: number;
  activeMembers: number;
}) {
  const [busy, setBusy] = useState<"pro" | "business" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: "pro" | "business") {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout failed");
        setBusy(null);
        return;
      }
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message ?? "Network error");
      setBusy(null);
    }
  }

  // Pricing math
  const proExtra  = Math.max(0, activeMembers - 5);
  const proPrice  = 29 + proExtra * 4;
  const bizExtra  = Math.max(0, activeMembers - 15);
  const bizPrice  = 79 + bizExtra * 3;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(5,8,16,0.92)", backdropFilter: "blur(16px)" }}
    >
      <div className="w-full max-w-[920px] my-8">
        <div className="text-center mb-6">
          <Bolt size={48} className="mx-auto" />
          <h1 className="font-display text-[40px] font-medium tracking-tight-3 mt-4 grad-text">
            Your trial ended {daysExpired === 0 ? "today" : `${daysExpired} day${daysExpired === 1 ? "" : "s"} ago`}
          </h1>
          <p className="text-[16px] text-ink-300 mt-2 max-w-[560px] mx-auto">
            Pick a plan to keep your team running. You can change or cancel anytime in Settings → Billing.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Pro */}
          <div className="card p-6 flex flex-col">
            <div className="text-[15px] font-semibold">Pro</div>
            <div className="text-[12px] text-ink-500 mt-0.5">For growing teams</div>
            <div className="mt-4 font-display text-[40px] font-medium grad-text-accent leading-none">${proPrice}<span className="text-[16px] text-ink-500 font-normal">/mo</span></div>
            <div className="text-[11px] text-ink-500 mt-1 font-mono">
              $29 base + 5 seats · $4/extra seat · {activeMembers} active
            </div>
            <button
              onClick={() => checkout("pro")}
              disabled={!!busy}
              className="btn-primary mt-5"
            >
              {busy === "pro" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy === "pro" ? "Redirecting…" : "Subscribe to Pro"}
              {busy !== "pro" && <ArrowRight className="w-4 h-4 arrow" />}
            </button>
            <div className="my-5 h-px" style={{ borderTop: "1px dashed rgba(255,255,255,0.08)" }} />
            <ul className="space-y-2 text-[13px] text-ink-300 flex-1">
              {[
                "AI Co-pilot (30+ tools)",
                "Auto-Scheduler",
                "Open-Shift Marketplace",
                "Geofenced clock-in + selfie",
                "Compliance Autopilot (11 jurisdictions)",
                "Audit log + GDPR export",
              ].map(f => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Business */}
          <div className="card p-6 flex flex-col relative ring-brand-glow border-brand-500/40">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-brand-500 text-white shadow-glow">
              Most popular
            </div>
            <div className="text-[15px] font-semibold">Business</div>
            <div className="text-[12px] text-ink-500 mt-0.5">Multi-location with payroll + POS</div>
            <div className="mt-4 font-display text-[40px] font-medium grad-text-accent leading-none">${bizPrice}<span className="text-[16px] text-ink-500 font-normal">/mo</span></div>
            <div className="text-[11px] text-ink-500 mt-1 font-mono">
              $79 base + 15 seats · $3/extra seat · {activeMembers} active
            </div>
            <button
              onClick={() => checkout("business")}
              disabled={!!busy}
              className="btn-primary mt-5"
            >
              {busy === "business" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy === "business" ? "Redirecting…" : "Subscribe to Business"}
              {busy !== "business" && <ArrowRight className="w-4 h-4 arrow" />}
            </button>
            <div className="my-5 h-px" style={{ borderTop: "1px dashed rgba(255,255,255,0.08)" }} />
            <ul className="space-y-2 text-[13px] text-ink-300 flex-1">
              {[
                "Everything in Pro",
                "Worker Network (cross-employer pool)",
                "EWA / Get paid early",
                "POS integrations (Toast/Square/Clover)",
                "Tip pooling + IRS Form 8027",
                "Predictability pay",
                "Multi-location dashboard",
              ].map(f => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {error && (
          <div className="card p-3 bg-rose-500/10 border-rose-500/30 text-rose-300 text-sm text-center mb-4">
            {error}
          </div>
        )}

        <div className="text-center space-y-3">
          <a
            href="mailto:sales@shyftforce.com?subject=Enterprise%20plan%20inquiry"
            className="btn-ghost btn-sm"
          >
            Need 200+ seats? Talk to sales →
          </a>
          <div className="text-[11px] text-ink-500">
            Your data is safe — we keep your workspace intact for 90 days even after trial expiry. Subscribe anytime to restore full access.
          </div>
        </div>
      </div>
    </div>
  );
}
