"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, Star, Users } from "lucide-react";
import { PLANS, calculateMonthlyCost, type PlanKey } from "@/lib/stripe";

const TIERS: { key: PlanKey; cta: string; ctaHref: string; tagline: string; features: string[]; featured?: boolean }[] = [
  {
    key: "free",
    cta: "Start free",
    ctaHref: "/signup",
    tagline: "Everything to run a tiny team",
    features: [
      "Schedule + time clock",
      "GPS-verified attendance",
      "Messenger + News Feed",
      "Time-off requests",
      "Up to 5 employees, 1 location",
    ],
  },
  {
    key: "pro",
    cta: "Start free trial",
    ctaHref: "/signup",
    tagline: "Most popular for small businesses",
    featured: true,
    features: [
      "Everything in Free",
      "AI Co-pilot + Auto-Scheduler",
      "Compliance Autopilot 2.0",
      "Open-shift marketplace",
      "Geofenced clock-in",
      "Payroll push (Finch)",
      "Advanced reports + CSV exports",
      "Up to 3 locations",
    ],
  },
  {
    key: "business",
    cta: "Start free trial",
    ctaHref: "/signup",
    tagline: "Multi-location with payroll, POS, and the worker network",
    features: [
      "Everything in Pro",
      "Worker Network (cross-employer pool)",
      "Earned Wage Access (EWA)",
      "POS integrations (Toast, Square, Clover)",
      "Per-client billing + invoicing",
      "Tip management",
      "Predictability pay (Fair Workweek)",
      "Unlimited locations",
    ],
  },
  {
    key: "enterprise",
    cta: "Contact sales",
    ctaHref: "mailto:sales@shyftforce.com",
    tagline: "SSO, custom SLA, volume discounts",
    features: [
      "Everything in Business",
      "SSO (SAML)",
      "Custom SLA · 99.99%",
      "Dedicated CSM",
      "Volume discount on per-seat",
      "On-premise option",
    ],
  },
];

export function PricingSection() {
  const [seats, setSeats] = useState(10);

  // Cost preview for each plan at the current seat count
  const costs = useMemo(() => ({
    free:       calculateMonthlyCost("free",       Math.min(seats, PLANS.free.maxMembersHard)),
    pro:        calculateMonthlyCost("pro",        seats),
    business:   calculateMonthlyCost("business",   seats),
    enterprise: null as null | ReturnType<typeof calculateMonthlyCost>,
  }), [seats]);

  return (
    <section id="pricing" className="py-24 bg-ink-50 dark:bg-ink-900/40 border-y border-ink-200/60 dark:border-ink-800/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Pricing</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight-2">Pay for what you actually use.</h2>
          <p className="text-ink-600 dark:text-ink-400 mt-4 max-w-2xl mx-auto">
            Flat monthly base, plus a small per-seat fee only above your included headcount. No surprises, no per-location nonsense.
            Open beta: every new signup gets a 7-day full-access trial. No credit card required.
          </p>
        </div>

        {/* Seat slider */}
        <div className="max-w-2xl mx-auto mb-10 card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="w-4 h-4 text-brand-500" /> Your team size
            </div>
            <div className="font-bold text-2xl tabular-nums tracking-tight-2">{seats}</div>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value, 10))}
            aria-label="Team size"
            className="w-full accent-brand-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-ink-500 dark:text-ink-400 mt-1">
            <span>1</span><span>25</span><span>50</span><span>75</span><span>100+</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {TIERS.map(t => {
            const def = PLANS[t.key];
            const cost = costs[t.key];
            const exceedsFreeCap = t.key === "free" && seats > def.maxMembersHard;
            return (
              <div key={t.key} className={`card p-6 relative flex flex-col ${t.featured ? "ring-2 ring-brand-500 shadow-card-hover xl:scale-[1.02]" : ""}`}>
                {t.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-orange flex items-center gap-1 px-3 py-1 whitespace-nowrap">
                    <Star className="w-3 h-3 fill-brand-700" /> Most popular
                  </div>
                )}

                <div className="font-bold text-lg">{def.label}</div>
                <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5 min-h-[28px]">{t.tagline}</p>

                <div className="mt-4">
                  {t.key === "enterprise" ? (
                    <>
                      <div className="text-4xl font-bold tracking-tight-2">Custom</div>
                      <div className="text-[11px] text-ink-500 mt-1">Volume pricing · talk to sales</div>
                    </>
                  ) : exceedsFreeCap ? (
                    <>
                      <div className="text-2xl font-bold text-ink-500">N/A</div>
                      <div className="text-[11px] text-rose-600 mt-1">Over the 5-seat Free cap — choose Pro or Business</div>
                    </>
                  ) : cost && (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold tracking-tight-2">${cost.totalUSD}</span>
                        <span className="text-sm text-ink-500 dark:text-ink-400">/mo</span>
                      </div>
                      {def.basePriceUSD === 0 ? (
                        <div className="text-[11px] text-ink-500 mt-1">Free forever · max {def.maxMembersHard} seats</div>
                      ) : (
                        <div className="text-[11px] text-ink-500 mt-1 leading-snug">
                          ${def.basePriceUSD} base + {def.includedSeats} seats included
                          {cost.overageSeats > 0 && (
                            <> · {cost.overageSeats} extra × ${def.perSeatUSD} = <span className="font-semibold">${cost.overageUSD}</span></>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Link href={t.ctaHref}
                      className={`mt-5 ${t.featured ? "btn-primary" : "btn-outline"} w-full py-2.5 justify-center`}>
                  {t.cta}
                </Link>

                <ul className="mt-5 space-y-2 text-sm flex-1">
                  {t.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-ink-700 dark:text-ink-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10 text-xs text-ink-500 dark:text-ink-400 flex items-center justify-center gap-2 flex-wrap">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Compare us to the others at this team size:</span>
          {(() => {
            // Quick competitor math — same seat count, common per-seat rates.
            const whenIWork = (seats * 8).toLocaleString();          // Plus tier
            const deputy    = Math.max(25, seats * 6).toLocaleString();
            return (
              <>
                <span><b>When I Work Plus:</b> ~${whenIWork}/mo</span>
                <span className="text-ink-300">·</span>
                <span><b>Deputy Premium:</b> ~${deputy}/mo</span>
                <span className="text-ink-300">·</span>
                <span><b>Us (Pro):</b> <span className="text-brand-600 dark:text-brand-400 font-bold">${costs.pro.totalUSD}/mo</span></span>
              </>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
