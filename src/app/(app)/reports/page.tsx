import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, fmtHours, fmtMoney, startOfWeek } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { ExportButton } from "@/components/reports/export-button";
import { BarChart3 } from "lucide-react";

export default async function ReportsPage() {
  const u = await requireUser();
  const orgId = u.organizationId;

  const [members, locations, period, kudos] = await Promise.all([
    prisma.member.findMany({ where: { organizationId: orgId, status: "active" }, include: { user: true, location: true } }),
    prisma.location.findMany({ where: { organizationId: orgId } }),
    prisma.payPeriod.findFirst({
      where: { organizationId: orgId, status: "open" },
      include: { entries: { include: { member: true } } },
    }),
    prisma.kudos.count(),
  ]);

  const entries = period?.entries ?? [];
  const totalHours = entries.reduce((a, e) => a + e.hours, 0);
  const totalCost  = entries.reduce((a, e) => a + e.hours * (e.member.hourlyRate ?? 0), 0);

  const byLocation = locations.map(loc => {
    const locMemberIds = members.filter(m => m.locationId === loc.id).map(m => m.id);
    const locEntries = entries.filter(e => locMemberIds.includes(e.memberId));
    const hrs = locEntries.reduce((a, e) => a + e.hours, 0);
    const cost = locEntries.reduce((a, e) => {
      const m = members.find(x => x.id === e.memberId); return a + e.hours * (m?.hourlyRate ?? 0);
    }, 0);
    const overtime = locEntries.filter(e => e.hours > 8).reduce((a, e) => a + (e.hours - 8), 0);
    return { id: loc.id, name: loc.name, hrs, cost, overtime, budget: loc.weeklyBudget ?? 0 };
  });

  const max = Math.max(1, ...byLocation.map(l => l.cost));

  // Hours by day-of-week (Mon-Sun)
  const byDow = [0,0,0,0,0,0,0];
  for (const e of entries) {
    const dow = (new Date(e.date).getDay() + 6) % 7; // Mon=0
    byDow[dow] += e.hours;
  }
  const dowMax = Math.max(1, ...byDow);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Analytics"
        icon={BarChart3}
        title="Reports"
        subtitle={period ? `Live snapshot · ${period.startsOn.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${period.endsOn.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No active pay period"}
      >
        <ExportButton type="timesheets" label="Timesheets CSV" />
        <ExportButton type="shifts"     label="Shifts CSV" />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total hours"     value={fmtHours(totalHours)} />
        <Stat label="Estimated cost"  value={fmtMoney(totalCost)} />
        <Stat label="Active members"  value={members.length} />
        <Stat label="High Fives sent" value={kudos} />
      </div>

      <section className="card p-6">
        <h3 className="h-section mb-4">Labor cost by location</h3>
        <ul className="space-y-4">
          {byLocation.map(l => {
            const pct = (l.cost / max) * 100;
            return (
              <li key={l.id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-semibold text-ink-900 dark:text-ink-50">{l.name}</span>
                  <span className="text-ink-700 dark:text-ink-300 tabular-nums text-xs">
                    <span className="font-semibold">{fmtMoney(l.cost)}</span>
                    <span className="text-ink-400 mx-1.5">·</span>
                    {fmtHours(l.hrs)}
                    {l.overtime > 0 && <><span className="text-ink-400 mx-1.5">·</span><span className="text-amber-700">{fmtHours(l.overtime)} OT</span></>}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all"
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-6">
        <h3 className="h-section mb-4">Hours by day of week</h3>
        <div className="grid grid-cols-7 gap-3">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => {
            const heightPct = Math.max(3, (byDow[i] / dowMax) * 100);
            return (
              <div key={d} className="flex flex-col items-center">
                <div className="relative w-full h-44 flex items-end rounded-xl bg-ink-50/60 dark:bg-ink-800/40 p-2">
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all hover:from-brand-700 hover:to-brand-500 shadow-sm"
                    style={{ height: `${heightPct}%` }}
                    title={`${byDow[i].toFixed(1)}h`}
                  />
                </div>
                <div className="text-[11px] text-ink-700 dark:text-ink-300 mt-2 font-semibold">{d}</div>
                <div className="text-[10px] text-ink-500 tabular-nums">{byDow[i].toFixed(0)}h</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 font-semibold tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-1.5 tracking-tight-2">{value}</div>
    </div>
  );
}
