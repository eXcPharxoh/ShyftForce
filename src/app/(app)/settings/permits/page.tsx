import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PermitsClient } from "@/components/settings/permits-client";
import { listPermits } from "@/lib/permits/service";
import { PERMIT_CATALOG } from "@/lib/permits/catalog";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PermitsPage() {
  const u = await requireManagerOrAdmin();
  const [permits, members] = await Promise.all([
    listPermits(u.organizationId),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  // Aggregate annual fee for the budgeting helper
  const annualBudgetCents = permits.reduce((acc, p) => acc + (p.feeAmountCents ?? 0), 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow="Compliance"
        icon={ShieldAlert}
        title="Permits & licences"
        subtitle="Agency + per-employee permits with auto-reminders and scheduler enforcement."
      />

      {/* Annual budget summary */}
      <section className="card p-5 bg-gradient-to-br from-brand-50 to-rose-50 dark:from-brand-500/10 dark:to-rose-500/10 border-brand-200/60 dark:border-brand-500/30">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] uppercase font-semibold tracking-wider text-brand-700 dark:text-brand-300">Annual permit budget</div>
            <div className="text-3xl font-bold tracking-tight-2 mt-0.5">${(annualBudgetCents / 100).toLocaleString()}</div>
            <p className="text-xs text-ink-500 mt-1">Sum of all permit fees · {permits.length} permit{permits.length === 1 ? "" : "s"}</p>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider">Coverage rules</div>
            <ul className="text-xs text-ink-700 dark:text-ink-300 space-y-0.5 mt-1">
              <li>Auto-text reminders at 60 / 30 / 14 / 7 / 0 days</li>
              <li>Expired blocking permits → guard cannot be scheduled</li>
              <li>Renewals reset the reminder cadence automatically</li>
            </ul>
          </div>
        </div>
      </section>

      <PermitsClient
        initial={permits.map(p => ({ ...p, expiresOn: p.expiresOn.toISOString() }))}
        members={members.map(m => ({ id: m.id, name: m.user.name }))}
        catalog={PERMIT_CATALOG}
      />
    </div>
  );
}
