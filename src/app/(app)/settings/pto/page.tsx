import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { AskAiHint } from "@/components/ui/ask-ai-hint";
import { ensureDefaultPolicies } from "@/lib/pto/service";
import { PolicyRow } from "@/components/pto/policy-row";
import { Plane } from "lucide-react";

export default async function PtoSettingsPage() {
  const u = await requireManagerOrAdmin();
  await ensureDefaultPolicies(u.organizationId);
  const policies = await prisma.ptoPolicy.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="People operations"
        icon={Plane}
        title="Time-off policies"
        subtitle="Set how each PTO category accrues. Existing balances aren't reset by edits."
      >
        <AskAiHint
          prompt="Help me set up time-off policies. I'm not sure what accrual method to pick or how many annual hours to give. Walk me through it for my business."
          label="Stuck? Let the assistant pick sane defaults"
        />
      </PageHeader>

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
          <div className="grid grid-cols-12 gap-2 text-[11px] uppercase font-semibold tracking-wider text-ink-500 dark:text-ink-400">
            <div className="col-span-3">Category</div>
            <div className="col-span-2">Annual hours</div>
            <div className="col-span-2">Accrual</div>
            <div className="col-span-2">Hours / day</div>
            <div className="col-span-2">Max balance</div>
            <div className="col-span-1 text-right">Active</div>
          </div>
        </header>
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {policies.map(p => (
            <PolicyRow key={p.id} policy={{
              id: p.id, name: p.name, category: p.category,
              annualHours: p.annualHours, accrualMethod: p.accrualMethod,
              hoursPerDay: p.hoursPerDay, maxBalance: p.maxBalance,
              allowNegative: p.allowNegative, active: p.active,
            }} />
          ))}
        </ul>
      </section>

      <section className="card p-5 bg-brand-50/40 dark:bg-brand-500/5 border-brand-200 dark:border-brand-500/20">
        <h3 className="h-section text-brand-900 dark:text-brand-200">How accrual works</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-brand-800 dark:text-brand-300/90 leading-relaxed">
          <li><b>Annual lump sum</b> — full annual hours credited each January 1 (pro-rated for new hires by months remaining)</li>
          <li><b>Unlimited</b> — no balance tracked. Requests still recorded for visibility.</li>
          <li>Set <code>annual hours = 0</code> on any category to stop tracking it (treated as unlimited).</li>
        </ul>
      </section>
    </div>
  );
}
