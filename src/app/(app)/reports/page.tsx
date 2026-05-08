import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, fmtHours, fmtMoney, startOfWeek } from "@/lib/utils";

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
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-ink-500">Live snapshot for the open pay period.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total hours" value={fmtHours(totalHours)} />
        <Stat label="Estimated cost" value={fmtMoney(totalCost)} />
        <Stat label="Active members" value={members.length} />
        <Stat label="High Fives sent" value={kudos} />
      </div>

      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Labor cost by location</h3>
        <ul className="space-y-3">
          {byLocation.map(l => (
            <li key={l.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{l.name}</span>
                <span className="text-ink-700 tabular-nums">{fmtMoney(l.cost)} · {fmtHours(l.hrs)} · {fmtHours(l.overtime)} OT</span>
              </div>
              <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-brand-500" style={{ width: `${(l.cost / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Hours by day of week</h3>
        <div className="grid grid-cols-7 gap-2 items-end h-40">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
            <div key={d} className="flex flex-col items-center justify-end">
              <div className="w-full rounded-t bg-brand-400" style={{ height: `${(byDow[i] / dowMax) * 100}%`, minHeight: 4 }} />
              <div className="text-[11px] text-ink-500 mt-1">{d}</div>
              <div className="text-[10px] text-ink-400 tabular-nums">{byDow[i].toFixed(0)}h</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 font-medium">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
