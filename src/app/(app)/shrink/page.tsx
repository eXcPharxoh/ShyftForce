import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ShrinkClient } from "@/components/grocery/shrink-client";
import { Trash } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ShrinkPage() {
  const u = await requireManagerOrAdmin();
  const [events, locations, departments] = await Promise.all([
    prisma.shrinkEvent.findMany({
      where: { organizationId: u.organizationId, occurredAt: { gte: addDays(new Date(), -30) } },
      include: { reportedBy: { include: { user: { select: { name: true } } } } },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { organizationId: u.organizationId, active: true }, orderBy: { name: "asc" } }),
  ]);

  const totalCents = events.reduce((a, e) => a + e.totalValueCents, 0);
  const byReason: Record<string, { count: number; valueCents: number }> = {};
  for (const e of events) {
    byReason[e.reason] = byReason[e.reason] ?? { count: 0, valueCents: 0 };
    byReason[e.reason].count++;
    byReason[e.reason].valueCents += e.totalValueCents;
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow="Grocery · Loss"
        icon={Trash}
        title="Shrink log"
        subtitle="Track damaged, spoiled, expired, and stolen merchandise. Slice losses by reason, department, and reporter."
      />

      <section className="card p-5 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 border-rose-200/60 dark:border-rose-500/30">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] uppercase font-semibold tracking-wider text-rose-700 dark:text-rose-300">30-day shrink</div>
            <div className="text-3xl font-bold tracking-tight-2 mt-0.5">${(totalCents / 100).toLocaleString()}</div>
            <p className="text-xs text-ink-500 mt-1">{events.length} event{events.length === 1 ? "" : "s"} reported in the last 30 days</p>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider">Breakdown</div>
            <ul className="text-xs space-y-0.5 mt-1">
              {Object.entries(byReason).map(([reason, v]) => (
                <li key={reason}><b>{reason}</b>: ${(v.valueCents / 100).toFixed(0)} · {v.count}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ShrinkClient
        initial={events.map(e => ({
          id: e.id, reason: e.reason, productName: e.productName, sku: e.sku,
          quantity: e.quantity, unitValueCents: e.unitValueCents, totalValueCents: e.totalValueCents,
          notes: e.notes, occurredAt: e.occurredAt.toISOString(),
          reportedByName: e.reportedBy?.user.name ?? null,
        }))}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
        departments={departments.map(d => ({ id: d.id, name: d.name, color: d.color }))}
      />
    </div>
  );
}
