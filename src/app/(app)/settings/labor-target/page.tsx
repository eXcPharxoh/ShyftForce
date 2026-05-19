import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { LaborTargetClient } from "@/components/settings/labor-target-client";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LaborTargetPage() {
  const u = await requireManagerOrAdmin();
  const [locations, targets] = await Promise.all([
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
    prisma.laborTarget.findMany({ where: { organizationId: u.organizationId } }),
  ]);
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Cost control"
        icon={Target}
        title="Labor % target & alerts"
        subtitle="Set the labor-cost-to-revenue % you want to hit. We text the manager if actuals creep past target during open hours."
      />
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-1">How it works</h3>
        <ul className="text-xs text-ink-500 dark:text-ink-400 space-y-0.5 list-disc list-inside">
          <li>Industry-typical restaurant target: 25–35% (depending on style)</li>
          <li>Cron runs hourly during open hours, pulls last 4h of POS revenue + clocked-in cost</li>
          <li>Texts manager when actual exceeds target by more than the threshold</li>
          <li>Cooldown prevents spam — won't re-alert within X minutes</li>
        </ul>
      </section>
      <LaborTargetClient
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
        initial={targets.map(t => ({
          id: t.id, locationId: t.locationId,
          targetPercent: t.targetPercent, breachThreshold: t.breachThreshold,
          cooldownMinutes: t.cooldownMinutes, active: t.active,
          lastAlertAt: t.lastAlertAt?.toISOString() ?? null,
          lastAlertActualPercent: t.lastAlertActualPercent,
        }))}
      />
    </div>
  );
}
