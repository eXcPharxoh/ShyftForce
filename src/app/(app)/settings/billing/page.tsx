import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/stripe";
import { BillingActions } from "@/components/billing/billing-actions";
import { CreditCard, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default async function BillingPage() {
  const u = await requireUser();
  const [org, memberCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: u.organizationId } }),
    prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } }),
  ]);
  if (!org) return null;
  const plan = (org.plan ?? "trial") as keyof typeof PLAN_LIMITS;
  const limit = PLAN_LIMITS[plan];
  const trialDaysLeft = org.trialEndsAt ? Math.max(0, Math.ceil((+org.trialEndsAt - Date.now()) / 86400000)) : null;
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Billing"
        icon={CreditCard}
        title="Billing & plan"
        subtitle="Manage your subscription, view invoices, update your card."
      />

      {/* Current plan */}
      <section className="card p-5 bg-gradient-to-br from-brand-50 to-rose-50 border-brand-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase font-semibold text-brand-700">Current plan</div>
            <h2 className="text-2xl font-bold mt-0.5">{limit.label}</h2>
            <div className="text-sm text-ink-700 mt-1">
              {plan === "trial" && trialDaysLeft != null && trialDaysLeft > 0 && (
                <>Trial expires in <b>{trialDaysLeft}</b> day{trialDaysLeft === 1 ? "" : "s"}.</>
              )}
              {plan === "trial" && (trialDaysLeft ?? 0) === 0 && <span className="text-rose-600 font-semibold">Trial expired — upgrade to keep using shyftforce.</span>}
              {plan !== "trial" && org.subscriptionStatus && <>Status: <b>{org.subscriptionStatus}</b></>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{limit.monthlyPriceUSD ? `$${limit.monthlyPriceUSD}` : (plan === "enterprise" ? "Custom" : "Free")}</div>
            <div className="text-[11px] text-ink-500">{limit.monthlyPriceUSD ? "/ month" : ""}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-ink-500" /> Seats: <b>{memberCount}</b> / {limit.seats === 9999 ? "∞" : limit.seats}</div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-ink-500" /> Audit log enabled</div>
        </div>
        {isManager && <BillingActions hasSubscription={!!org.stripeSubscriptionId} currentPlan={plan} />}
      </section>

      {/* Plan options */}
      <section>
        <h3 className="text-sm font-semibold mb-3">Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["starter", "pro", "enterprise"] as const).map(p => {
            const meta = PLAN_LIMITS[p];
            const isCurrent = plan === p;
            return (
              <div key={p} className={`card p-5 ${p === "pro" ? "border-brand-300 ring-2 ring-brand-100" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold">{meta.label}</div>
                  {p === "pro" && <span className="badge-orange flex items-center gap-1"><Sparkles className="w-3 h-3" /> Most popular</span>}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <div className="text-3xl font-bold">{meta.monthlyPriceUSD ? `$${meta.monthlyPriceUSD}` : "Custom"}</div>
                  {meta.monthlyPriceUSD > 0 && <div className="text-xs text-ink-500">/ mo</div>}
                </div>
                <ul className="text-xs space-y-1.5 mt-3 text-ink-700">
                  <li>✓ Up to {meta.seats === 9999 ? "unlimited" : meta.seats} seats</li>
                  <li>✓ All scheduling + payroll features</li>
                  <li>✓ AI Co-pilot & Auto-Scheduler</li>
                  <li>✓ Compliance Autopilot</li>
                  <li>✓ Geofenced clock-in</li>
                  {p === "pro" && <li>✓ Priority support · advanced analytics</li>}
                  {p === "enterprise" && <><li>✓ SSO (SAML)</li><li>✓ Custom SLA</li><li>✓ Dedicated CSM</li></>}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
