import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateEwaSettings } from "@/lib/ewa/settings";
import { PageHeader } from "@/components/ui/page-header";
import { EwaSettingsForm } from "@/components/ewa/settings-form";
import { Wallet, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EwaSettingsPage() {
  const u = await requireManagerOrAdmin();
  const [settings, history] = await Promise.all([
    getOrCreateEwaSettings(u.organizationId),
    prisma.ewaWithdrawal.findMany({
      where: { organizationId: u.organizationId },
      orderBy: { requestedAt: "desc" }, take: 25,
      include: { member: { include: { user: true } } },
    }),
  ]);

  const totalOutCents = history.filter((w) => w.status === "pending" || w.status === "processing").reduce((a, w) => a + w.amountCents, 0);
  const totalSettledCents = history.filter((w) => w.status === "settled").reduce((a, w) => a + w.amountCents, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Pay & retention"
        icon={Wallet}
        title="Earned Wage Access"
        subtitle={settings.enabled ? "Active — employees can request advances" : "Off — turn on below to enable early pay"}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Pending advances" value={`$${(totalOutCents/100).toFixed(0)}`} tone="amber" />
        <Stat label="Settled this pay period" value={`$${(totalSettledCents/100).toFixed(0)}`} tone="emerald" />
        <Stat label="Provider" value={settings.providerName.replace(/_/g, " ")} tone="ink" />
      </div>

      <section className="card p-5">
        <h3 className="text-sm font-bold mb-3">Configuration</h3>
        <EwaSettingsForm initial={{
          enabled: settings.enabled,
          earnedRatePercent: settings.earnedRatePercent,
          feeCentsPerWithdrawal: settings.feeCentsPerWithdrawal,
          minWithdrawalCents: settings.minWithdrawalCents,
          maxPerPayPeriodCents: settings.maxPerPayPeriodCents,
          providerName: settings.providerName,
          notes: settings.notes,
        }} />
      </section>

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-ink-500" />
          <h3 className="text-sm font-semibold">Recent withdrawals (across the org)</h3>
        </header>
        {history.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500 dark:text-ink-400">No EWA withdrawals yet.</div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {history.map((w) => (
              <li key={w.id} className="px-5 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{w.member.user.name} · ${(w.amountCents/100).toFixed(2)}</div>
                  <div className="text-[11px] text-ink-500">
                    {new Date(w.requestedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {w.payoutMethod && ` · ${w.payoutMethod}`}
                    {w.failureReason && ` · ${w.failureReason}`}
                  </div>
                </div>
                <span className={
                  w.status === "settled" ? "badge-green" :
                  w.status === "pending" || w.status === "processing" ? "badge-amber" :
                  w.status === "failed" || w.status === "canceled" ? "badge-red" : "badge-gray"
                }>{w.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "ink" | "amber" | "emerald" }) {
  const colors: Record<string, string> = {
    ink: "text-ink-900 dark:text-ink-50",
    amber: "text-amber-700 dark:text-amber-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 tracking-tight-2 ${colors[tone]}`}>{value}</div>
    </div>
  );
}
