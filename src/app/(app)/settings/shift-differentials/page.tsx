import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ShiftDifferentialsClient } from "@/components/settings/shift-differentials-client";
import { Moon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShiftDifferentialsPage() {
  const u = await requireManagerOrAdmin();
  const rules = await prisma.shiftDifferential.findMany({
    where: { organizationId: u.organizationId },
    orderBy: [{ active: "desc" }, { multiplier: "desc" }],
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Pay rules"
        icon={Moon}
        title="Shift differentials"
        subtitle="Multipliers for night/weekend/holiday hours. Payroll exports apply the highest matching rule per hour worked."
      />

      <section className="card p-5 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-500/10 dark:to-amber-500/10 border-brand-200/60 dark:border-brand-500/30">
        <h3 className="text-sm font-semibold mb-1">How differentials work</h3>
        <ul className="text-xs text-ink-700 dark:text-ink-300 space-y-1 mt-2 list-disc list-inside">
          <li><b>Night</b>: applies between <i>startHour</i> and <i>endHour</i> (e.g. 22:00 → 06:00 wraps midnight)</li>
          <li><b>Weekend</b>: leave hours blank to cover the full day; set <i>dayOfWeek</i> (0=Sun, 6=Sat) or leave blank for both</li>
          <li><b>Holiday</b>: provide an array of ISO dates (YYYY-MM-DD)</li>
          <li><b>Multiplier stacking</b>: only the <b>highest</b> matching multiplier applies per hour — they don't compound</li>
        </ul>
      </section>

      <ShiftDifferentialsClient
        initial={rules.map(r => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          startHour: r.startHour,
          endHour: r.endHour,
          dayOfWeek: r.dayOfWeek,
          holidayDates: r.holidayDates,
          multiplier: r.multiplier,
          flatAddCents: r.flatAddCents,
          active: r.active,
        }))}
      />
    </div>
  );
}
