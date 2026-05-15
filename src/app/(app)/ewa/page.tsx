import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getEwaBalance } from "@/lib/ewa/calc";
import { PageHeader } from "@/components/ui/page-header";
import { WithdrawButton } from "@/components/ewa/withdraw-button";
import { Wallet, Sparkles, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EwaPage() {
  const u = await requireUser();
  const balance = await getEwaBalance({ memberId: u.memberId, organizationId: u.organizationId });
  const history = await prisma.ewaWithdrawal.findMany({
    where: { memberId: u.memberId, organizationId: u.organizationId },
    orderBy: { requestedAt: "desc" }, take: 20,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Earned wage access"
        icon={Wallet}
        title="Get paid early"
        subtitle={balance.enabled
          ? `Take a portion of what you've already earned this pay period`
          : `Your employer hasn't enabled early pay yet`}
      >
        {balance.enabled && balance.availableCents >= balance.minWithdrawalCents && <WithdrawButton balance={balance} />}
      </PageHeader>

      {!balance.enabled && (
        <section className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-ink-50 dark:bg-ink-800 text-ink-500 flex items-center justify-center mb-3"><Wallet className="w-8 h-8" /></div>
          <h3 className="font-bold text-base">Early pay isn&apos;t turned on for your team</h3>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1 max-w-md mx-auto">
            Ask your manager to enable Earned Wage Access from Settings → EWA. Once enabled, you&apos;ll see what you&apos;ve earned in real time and can request an advance.
          </p>
        </section>
      )}

      {balance.enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Stat label="Earned this period" value={`$${(balance.grossEarnedCents/100).toFixed(2)}`} sub={`${balance.hoursWorked.toFixed(1)}h × $${balance.hourlyRate.toFixed(2)}/h`} tone="ink" />
            <Stat label="Available to take now" value={`$${(balance.availableCents/100).toFixed(2)}`} sub={`Up to ${(balance.availableCents > 0 ? Math.round((balance.availableCents/balance.accessibleCents)*100) : 0)}% of accessible`} tone="brand" />
            <Stat label="Already taken this period" value={`$${(balance.alreadyTakenCents/100).toFixed(2)}`} sub={`Cap $${(balance.capCents/100).toFixed(0)} per period`} tone="amber" />
          </div>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-brand-600" /> What this is</h3>
              <span className="text-[11px] text-ink-500 dark:text-ink-400">Fee per request: ${(balance.feeCentsPerWithdrawal/100).toFixed(2)} · min ${(balance.minWithdrawalCents/100).toFixed(0)}</span>
            </div>
            <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
              Instead of waiting for payday, you can pull a portion of what you&apos;ve already worked for. The amount you take is automatically deducted from your next paycheck.
              No interest, no debt — just earlier access to money you&apos;ve already earned.
            </p>
          </section>

          <section className="card overflow-hidden">
            <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
              <h3 className="text-sm font-semibold">Your withdrawals</h3>
            </header>
            {history.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-500 dark:text-ink-400">
                No withdrawals yet. Tap <span className="font-semibold">Get paid early</span> above to take your first advance.
              </div>
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {history.map((w) => (
                  <li key={w.id} className="px-5 py-3 flex items-center gap-3">
                    <StatusDot status={w.status} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">${(w.amountCents/100).toFixed(2)} <span className="text-ink-500 font-normal text-xs">+ ${(w.feeCentsCharged/100).toFixed(2)} fee</span></div>
                      <div className="text-[11px] text-ink-500 dark:text-ink-400">
                        {new Date(w.requestedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {w.payoutMethod && ` · ${w.payoutMethod}`}
                        {w.failureReason && ` · ${w.failureReason}`}
                      </div>
                    </div>
                    <span className={statusBadge(w.status)}>{w.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, [any, string]> = {
    pending: [Clock, "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15"],
    processing: [Clock, "text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/15"],
    settled: [CheckCircle2, "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15"],
    failed: [XCircle, "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15"],
    canceled: [XCircle, "text-ink-700 dark:text-ink-300 bg-ink-100 dark:bg-ink-800"],
  };
  const [Icon, cls] = map[status] ?? [AlertTriangle, "text-ink-700 dark:text-ink-300 bg-ink-100 dark:bg-ink-800"];
  return <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cls}`}><Icon className="w-4 h-4" /></div>;
}
function statusBadge(s: string) {
  if (s === "settled") return "badge-green";
  if (s === "pending" || s === "processing") return "badge-amber";
  if (s === "failed" || s === "canceled") return "badge-red";
  return "badge-gray";
}
function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "ink" | "brand" | "amber" }) {
  const colors: Record<string, string> = {
    ink: "text-ink-900 dark:text-ink-50",
    brand: "text-brand-700 dark:text-brand-300",
    amber: "text-amber-700 dark:text-amber-300",
  };
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 tracking-tight-2 ${colors[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">{sub}</div>}
    </div>
  );
}
