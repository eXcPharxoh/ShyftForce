import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Dumbbell, Users } from "lucide-react";
import { addDays } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RANGES = { week: 7, month: 30, quarter: 90 };

export default async function ClassAttendanceReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const rangeKey = (sp.range ?? "month") as keyof typeof RANGES;
  const days = RANGES[rangeKey] ?? 30;
  const since = addDays(new Date(), -days);

  const occurrences = await prisma.classOccurrence.findMany({
    where: {
      fitnessClass: { organizationId: u.organizationId },
      startsAt: { gte: since },
    },
    include: {
      fitnessClass: { select: { name: true, color: true, capacity: true } },
      instructor:   { include: { user: { select: { name: true } } } },
    },
    orderBy: { startsAt: "desc" },
  });

  // Per-class stats
  const byClass = new Map<string, { name: string; color: string; capacity: number; sessions: number; attendees: number; cancelled: number; cap: number }>();
  for (const o of occurrences) {
    const key = o.fitnessClassId;
    if (!byClass.has(key)) byClass.set(key, {
      name: o.fitnessClass.name, color: o.fitnessClass.color,
      capacity: o.fitnessClass.capacity, sessions: 0, attendees: 0, cancelled: 0, cap: 0,
    });
    const v = byClass.get(key)!;
    v.sessions++;
    if (o.status === "cancelled") v.cancelled++;
    else { v.attendees += o.attendees; v.cap += o.fitnessClass.capacity; }
  }
  const classRanked = Array.from(byClass.values())
    .map(v => ({ ...v, fillRate: v.cap > 0 ? (v.attendees / v.cap) * 100 : 0, avg: v.sessions - v.cancelled > 0 ? v.attendees / (v.sessions - v.cancelled) : 0 }))
    .sort((a, b) => b.fillRate - a.fillRate);

  // Per-instructor stats
  const byInstructor = new Map<string, { name: string; sessions: number; attendees: number; cap: number; cancelled: number }>();
  for (const o of occurrences) {
    const key = o.instructorMemberId;
    if (!byInstructor.has(key)) byInstructor.set(key, { name: o.instructor.user.name, sessions: 0, attendees: 0, cap: 0, cancelled: 0 });
    const v = byInstructor.get(key)!;
    v.sessions++;
    if (o.status === "cancelled") v.cancelled++;
    else { v.attendees += o.attendees; v.cap += o.fitnessClass.capacity; }
  }
  const instructorRanked = Array.from(byInstructor.values())
    .map(v => ({ ...v, fillRate: v.cap > 0 ? (v.attendees / v.cap) * 100 : 0, avg: v.sessions - v.cancelled > 0 ? v.attendees / (v.sessions - v.cancelled) : 0 }))
    .sort((a, b) => b.fillRate - a.fillRate);

  const totalSessions = occurrences.length;
  const totalAttendees = occurrences.reduce((a, o) => a + o.attendees, 0);
  const totalCap = occurrences.filter(o => o.status !== "cancelled").reduce((a, o) => a + o.fitnessClass.capacity, 0);
  const orgFillRate = totalCap > 0 ? (totalAttendees / totalCap) * 100 : 0;
  const cancelled = occurrences.filter(o => o.status === "cancelled").length;

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        eyebrow="Fitness · Report"
        icon={Dumbbell}
        title="Class attendance"
        subtitle="Fill rate per class and per instructor. Identify your stars + classes that need rebranding or rescheduling."
      >
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-xl">
          {Object.keys(RANGES).map(k => (
            <Link key={k} href={`/reports/class-attendance?range=${k}`} className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${rangeKey === k ? "bg-white dark:bg-ink-900 shadow" : ""}`}>
              {k}
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* KPI */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Org fill rate</div>
          <div className={`text-2xl font-bold tracking-tight-2 mt-1 ${orgFillRate >= 75 ? "text-emerald-600" : orgFillRate >= 50 ? "text-amber-600" : "text-rose-600"}`}>
            {orgFillRate.toFixed(0)}%
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5">{totalAttendees}/{totalCap} seats filled</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Sessions held</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">{totalSessions - cancelled}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">{cancelled} cancelled</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Top class</div>
          <div className="text-base font-bold tracking-tight-2 mt-1 truncate">{classRanked[0]?.name ?? "—"}</div>
          {classRanked[0] && <div className="text-[11px] text-emerald-600 mt-0.5">{classRanked[0].fillRate.toFixed(0)}% fill</div>}
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Top instructor</div>
          <div className="text-base font-bold tracking-tight-2 mt-1 truncate">{instructorRanked[0]?.name ?? "—"}</div>
          {instructorRanked[0] && <div className="text-[11px] text-emerald-600 mt-0.5">{instructorRanked[0].fillRate.toFixed(0)}% fill</div>}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {/* By class */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold mb-3">By class</h3>
          {classRanked.length === 0 ? (
            <p className="text-sm text-ink-500">No data.</p>
          ) : (
            <ul className="space-y-2">
              {classRanked.map(c => (
                <li key={c.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="text-ink-500"><b>{c.fillRate.toFixed(0)}%</b> · {c.avg.toFixed(0)} avg · {c.sessions} sessions</span>
                  </div>
                  <div className="w-full bg-ink-100 dark:bg-ink-800 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, c.fillRate)}%`, background: c.color }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* By instructor */}
        <section className="card p-5">
          <h3 className="text-sm font-semibold mb-3">By instructor</h3>
          {instructorRanked.length === 0 ? (
            <p className="text-sm text-ink-500">No data.</p>
          ) : (
            <ul className="space-y-1">
              {instructorRanked.map((v, i) => (
                <li key={v.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    i === 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  }`}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{v.name}</div>
                    <div className="text-[11px] text-ink-500">{v.sessions} sessions · {v.avg.toFixed(0)} avg attendance</div>
                  </div>
                  <span className={`text-sm font-bold ${v.fillRate >= 75 ? "text-emerald-600" : v.fillRate >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                    {v.fillRate.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
