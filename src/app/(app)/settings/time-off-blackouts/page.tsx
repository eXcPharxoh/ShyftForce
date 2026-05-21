import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarX } from "lucide-react";
import { BlackoutsClient } from "@/components/settings/blackouts-client";

export const dynamic = "force-dynamic";

export default async function TimeOffBlackoutsPage() {
  const u = await requireManagerOrAdmin();
  const now = new Date();

  const [blackouts, locations] = await Promise.all([
    prisma.timeOffBlackout.findMany({
      where: { organizationId: u.organizationId, endsOn: { gte: now } },
      include: {
        location:   { select: { name: true } },
        createdBy:  { include: { user: { select: { name: true } } } },
      },
      orderBy: { startsOn: "asc" },
      take: 100,
    }),
    prisma.location.findMany({
      where: { organizationId: u.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const initial = blackouts.map(b => ({
    id: b.id,
    name: b.name,
    startsOn: b.startsOn.toISOString().slice(0, 10),
    endsOn:   b.endsOn.toISOString().slice(0, 10),
    mode: b.mode as "hard" | "soft" | "warn",
    locationId: b.locationId,
    locationName: b.location?.name ?? null,
    createdByName: b.createdBy?.user.name ?? null,
  }));

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow="Time off"
        icon={CalendarX}
        title="Blackout windows"
        subtitle="Block (or warn on) time-off requests during peak periods, audits, holiday rushes, and short-staffed weeks."
      />

      <BlackoutsClient initial={initial} locations={locations} />

      <section className="card p-5 bg-brand-50/40 dark:bg-brand-500/5 border-brand-200 dark:border-brand-500/20">
        <h3 className="h-section text-brand-900 dark:text-brand-200">How blackout modes work</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-brand-800 dark:text-brand-300/90 leading-relaxed">
          <li><b>Hard</b> — staff cannot submit requests overlapping the window. They see the blackout reason instead.</li>
          <li><b>Soft</b> — requests are allowed but flagged for manager review. Managers see the conflict before approving.</li>
          <li><b>Warn</b> — request goes through normally but staff see a heads-up before submitting (e.g. "Holiday rush — approval less likely").</li>
        </ul>
      </section>
    </div>
  );
}
