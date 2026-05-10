import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { FinchConnectCard } from "@/components/integrations/finch-card";
import { Wrench, MessageSquare, Calendar, CreditCard } from "lucide-react";

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const org = await prisma.organization.findUnique({ where: { id: u.organizationId } });

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Workspace"
        icon={Wrench}
        title="Integrations"
        subtitle="Connect shyftforce to your payroll, calendar, and team tools."
      />

      {sp.connected && (
        <div className="card p-4 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-sm">
          ✅ Payroll provider connected. Run a sync below to match employees.
        </div>
      )}
      {sp.error && (
        <div className="card p-4 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200 text-sm">
          Connection failed: {sp.error}
        </div>
      )}

      <FinchConnectCard
        connected={!!org?.finchAccessToken}
        provider={org?.finchProviderId}
        connectedAt={org?.finchConnectedAt?.toISOString()}
      />

      <section className="card p-5">
        <h3 className="h-section mb-3">Coming soon</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {[
            { icon: CreditCard,    name: "Stripe",          desc: "Customer billing (already wired)" },
            { icon: Calendar,      name: "Google Calendar", desc: "Auto-sync each member's shifts" },
            { icon: MessageSquare, name: "Slack",           desc: "Notify channels for approvals + alerts" },
            { icon: MessageSquare, name: "Microsoft Teams", desc: "Same as Slack, for the M365 crowd" },
            { icon: Calendar,      name: "Square / Toast",  desc: "POS sales for tip pool + demand forecasting" },
            { icon: Calendar,      name: "QuickBooks",      desc: "Direct accounting export" },
          ].map(i => {
            const Icon = i.icon;
            return (
              <li key={i.name} className="flex items-center gap-2.5 p-3 rounded-xl border border-ink-200 dark:border-ink-800">
                <div className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-400 flex items-center justify-center"><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">{i.name}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">{i.desc}</div>
                </div>
                <span className="badge-gray">soon</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
