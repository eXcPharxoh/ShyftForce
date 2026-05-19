import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { LossPreventionClient } from "@/components/retail/lp-client";
import { ShieldAlert } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LossPreventionPage() {
  const u = await requireUser();
  const [events, locations] = await Promise.all([
    prisma.lossPreventionEvent.findMany({
      where: { organizationId: u.organizationId, occurredAt: { gte: addDays(new Date(), -30) } },
      include: { reportedBy: { include: { user: { select: { name: true } } } } },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  const totalCents = events.reduce((a, e) => a + (e.valueCents ?? 0), 0);
  const byType: Record<string, { count: number; valueCents: number }> = {};
  for (const e of events) {
    byType[e.type] = byType[e.type] ?? { count: 0, valueCents: 0 };
    byType[e.type].count++;
    byType[e.type].valueCents += (e.valueCents ?? 0);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow="Retail · Asset Protection"
        icon={ShieldAlert}
        title="Loss prevention log"
        subtitle="Quick-log theft, register errors, breakage, and refund fraud. Trend per-type for asset-protection reviews."
      />

      <section className="card p-5 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-rose-200/60 dark:border-rose-500/30">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] uppercase font-semibold tracking-wider text-rose-700 dark:text-rose-300">30-day loss</div>
            <div className="text-3xl font-bold tracking-tight-2 mt-0.5">${(totalCents / 100).toLocaleString()}</div>
            <p className="text-xs text-ink-500 mt-1">{events.length} event{events.length === 1 ? "" : "s"}</p>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider">By type</div>
            <ul className="text-xs space-y-0.5 mt-1">
              {Object.entries(byType).map(([type, v]) => (
                <li key={type}><b>{type.replace("_", " ")}</b>: {v.count} · ${(v.valueCents / 100).toFixed(0)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <LossPreventionClient
        initial={events.map(e => ({
          id: e.id, type: e.type, description: e.description,
          valueCents: e.valueCents, occurredAt: e.occurredAt.toISOString(),
          reportedByName: e.reportedBy?.user.name ?? null,
        }))}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
      />
    </div>
  );
}
