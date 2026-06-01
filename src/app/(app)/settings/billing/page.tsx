import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLANS, calculateMonthlyCost, effectivePlanKey, isTrialActive, normalizePlanKey } from "@/lib/stripe";
import { BillingActions } from "@/components/billing/billing-actions";
import { CreditCard, Sparkles, Users, Building2, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default async function BillingPage() {
  const u = await requireUser();
  const [org, memberCount, locationCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: u.organizationId } }),
    prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } }),
    prisma.location.count({ where: { organizationId: u.organizationId } }),
  ]);
  if (!org) return null;

  const onTrial = isTrialActive(org);
  // What plan they're effectively running on right now (trial = business)
  const plan = effectivePlanKey(org);
  // What plan is stored / what they'll fall back to when the trial ends
  const storedPlan = normalizePlanKey(org.plan);
  const def  = PLANS[plan];
  const cost = calculateMonthlyCost(plan, memberCount);
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const trialDaysLeft = org.trialEndsAt ? Math.max(0, Math.ceil((+org.trialEndsAt - Date.now()) / 86400000)) : null;

  // While trial is active, caps are functionally infinite — hide cap warnings.
  const seatsRemaining = onTrial ? 9999 : def.maxMembersHard - memberCount;
  const seatHardCapped = !onTrial && def.maxMembersHard < 9999;
  const locOverLimit   = !onTrial && locationCount > def.maxLocations;

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Billing"
        icon={CreditCard}
        title="Billing & plan"
        subtitle="Your subscription, seat usage, and invoices."
      />

      {/* Current plan card */}
      <section className="card p-6 bg-gradient-to-br from-brand-50 to-rose-50 dark:from-brand-500/10 dark:to-rose-500/10 border-brand-200/60 dark:border-brand-500/30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] uppercase font-semibold tracking-wider text-brand-700 dark:text-brand-300">
              {onTrial ? "Free trial · everything unlocked" : "Current plan"}
            </div>
            <h2 className="text-3xl font-bold mt-0.5 tracking-tight-2">
              {onTrial ? "Business (trial)" : def.label}
            </h2>
            <p className="text-sm text-ink-700 dark:text-ink-300 mt-1">
              {onTrial
                ? "Unlimited employees + locations, every feature on. No credit card required during open beta."
                : def.tagline}
            </p>
            {plan === "free" && !onTrial && (
              <div className="text-xs text-ink-500 dark:text-ink-400 mt-2">Forever free · capped at {def.maxMembersHard} active employees + 1 location.</div>
            )}
            {trialDaysLeft != null && trialDaysLeft > 0 && (
              <div className="text-xs mt-2">
                <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">7-day trial</span>
                <span className="text-ink-700 dark:text-ink-300 ml-1.5">
                  <b>{trialDaysLeft}</b> day{trialDaysLeft === 1 ? "" : "s"} left.
                  After trial you stay on {PLANS[storedPlan].label} until you upgrade.
                </span>
              </div>
            )}
            {org.subscriptionStatus && org.subscriptionStatus !== "trialing" && (
              <div className="text-xs text-ink-700 dark:text-ink-300 mt-2">
                Stripe status: <b>{org.subscriptionStatus}</b>
              </div>
            )}
          </div>
          <div className="text-right">
            {plan === "enterprise" ? (
              <>
                <div className="text-4xl font-bold tracking-tight-2">Custom</div>
                <div className="text-[11px] text-ink-500">Volume contract</div>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold tracking-tight-2">${cost.totalUSD}<span className="text-base font-normal text-ink-500"> /mo</span></div>
                <div className="text-[11px] text-ink-500 mt-1">{memberCount} active member{memberCount === 1 ? "" : "s"}</div>
              </>
            )}
          </div>
        </div>

        {/* Cost breakdown */}
        {plan !== "enterprise" && plan !== "free" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-5 text-xs">
            <CostRow label="Base subscription" value={`$${def.basePriceUSD}`} sub={`${def.includedSeats} seats included`} />
            <CostRow label="Extra seats" value={`${cost.overageSeats} × $${def.perSeatUSD}`} sub={cost.overageSeats === 0 ? "Headroom: no overage" : `$${cost.overageUSD}/mo over base`} />
            <CostRow label="Monthly total" value={`$${cost.totalUSD}`} sub="Prorated when seats change" tone="brand" />
          </div>
        )}

        {/* Seat usage bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
            <span><Users className="w-3 h-3 inline mr-1" /> Seat usage</span>
            <span className="tabular-nums">{memberCount}{seatHardCapped ? ` / ${def.maxMembersHard}` : ""}</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
            <div
              className={`h-full transition-all ${
                seatHardCapped && memberCount >= def.maxMembersHard
                  ? "bg-rose-500"
                  : seatHardCapped && memberCount / def.maxMembersHard > 0.8
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-brand-500 to-rose-500"
              }`}
              style={{
                width: `${Math.min(100,
                  seatHardCapped
                    ? (memberCount / def.maxMembersHard) * 100
                    : Math.min(100, (memberCount / Math.max(def.includedSeats * 2, 10)) * 100)
                )}%`,
              }}
            />
          </div>
          {seatHardCapped && seatsRemaining <= 1 && (
            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5">
              {seatsRemaining === 0
                ? "You're at the seat limit. Upgrade to Pro to add more employees."
                : "1 seat remaining on the free plan. Upgrade to Pro before adding more."}
            </div>
          )}
        </div>

        {locOverLimit && (
          <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-3 text-xs flex items-start gap-2">
            <Building2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              You have <b>{locationCount}</b> locations, but {def.label} only supports <b>{def.maxLocations}</b>.
              Upgrade your plan to keep all locations active.
            </div>
          </div>
        )}

        {isManager && plan !== "enterprise" && (
          <div className="mt-5 pt-5 border-t border-brand-200/60 dark:border-brand-500/20">
            <BillingActions
              hasSubscription={!!org.stripeSubscriptionId}
              currentPlan={plan as any}
              stripeConfigured={!!process.env.STRIPE_SECRET_KEY}
            />
          </div>
        )}
      </section>

      {/* Plan options grid */}
      <section>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-brand-500" /> Change plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["pro", "business", "enterprise"] as const).map(p => {
            const meta = PLANS[p];
            const isCurrent = plan === p;
            const previewCost = p !== "enterprise" ? calculateMonthlyCost(p, memberCount) : null;
            return (
              <div key={p} className={`card p-5 relative ${p === "pro" ? "border-brand-300 ring-2 ring-brand-100 dark:ring-brand-500/30" : ""} ${isCurrent ? "bg-brand-50/40 dark:bg-brand-500/10" : ""}`}>
                {isCurrent && (
                  <div className="absolute top-3 right-3 badge-green flex items-center gap-1 text-[10px]">
                    <Check className="w-3 h-3" /> Current
                  </div>
                )}
                <div className="font-bold">{meta.label}</div>
                <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">{meta.tagline}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  {previewCost ? (
                    <>
                      <span className="text-3xl font-bold tracking-tight-2">${previewCost.totalUSD}</span>
                      <span className="text-xs text-ink-500">/mo</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold tracking-tight-2">Custom</span>
                  )}
                </div>
                <div className="text-[11px] text-ink-500 mt-0.5">
                  {p !== "enterprise"
                    ? `$${meta.basePriceUSD} + ${meta.includedSeats} seats + $${meta.perSeatUSD}/extra`
                    : "Volume contract"}
                </div>
                {previewCost && previewCost.overageSeats > 0 && (
                  <div className="text-[10px] text-ink-500 mt-1">
                    At your {memberCount} members: ${meta.basePriceUSD} + {previewCost.overageSeats} × ${meta.perSeatUSD} = <b>${previewCost.totalUSD}</b>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CostRow({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "brand" }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "brand" ? "border-brand-300 bg-white/60 dark:bg-ink-900 dark:border-brand-500/30" : "border-ink-200 dark:border-ink-800 bg-white/40 dark:bg-ink-900/40"}`}>
      <div className="text-[10px] uppercase font-semibold text-ink-500 tracking-wider">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${tone === "brand" ? "text-brand-700 dark:text-brand-300" : ""}`}>{value}</div>
      <div className="text-[10px] text-ink-500">{sub}</div>
    </div>
  );
}
