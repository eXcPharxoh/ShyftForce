import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, initials, startOfWeek, timeLabel } from "@/lib/utils";
import { ScheduleControls } from "@/components/schedule/schedule-controls";
import { AutoScheduleButton } from "@/components/schedule/auto-schedule-button";
import { ScheduleActions } from "@/components/schedule/schedule-actions";
import { PublishWeekButton } from "@/components/schedule/publish-week-button";
import { TemplatesButton } from "@/components/schedule/templates-button";
import { ShiftCell } from "@/components/schedule/shift-cell";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const weekOffset = parseInt(sp.w ?? "0", 10);
  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const weekEnd = addDays(weekStart, 7);

  const [members, shifts, locations, departments, crews, periods] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: true, location: true },
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    }),
    prisma.shift.findMany({
      where: { location: { organizationId: u.organizationId }, startsAt: { gte: weekStart, lt: weekEnd } },
      include: { member: { include: { user: true } }, location: true },
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId } }),
    prisma.department.findMany({
      where: { organizationId: u.organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.crew.findMany({
      where: { organizationId: u.organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.classPeriod.findMany({
      where: { organizationId: u.organizationId, active: true },
      orderBy: { number: "asc" },
      select: { id: true, number: true, name: true, startTime: true, endTime: true },
    }),
  ]);
  const verticalOptions = {
    industry: u.organizationIndustry,
    departments,
    crews,
    periods,
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const totalHours = shifts.reduce((acc, s) => acc + (+s.endsAt - +s.startsAt) / 3600000, 0);
  const openShifts = shifts.filter(s => s.isOpen);
  const drafts = shifts.filter(s => s.status === "draft");

  // Group shifts by member then day
  const byMemberDay = new Map<string, Map<number, typeof shifts>>();
  for (const s of shifts) {
    if (!s.memberId) continue;
    const dayIdx = Math.floor((+s.startsAt - +weekStart) / 86400000);
    if (!byMemberDay.has(s.memberId)) byMemberDay.set(s.memberId, new Map());
    const m = byMemberDay.get(s.memberId)!;
    if (!m.has(dayIdx)) m.set(dayIdx, [] as any);
    (m.get(dayIdx) as any).push(s);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-ink-500">{dateLabel(weekStart)} → {dateLabel(addDays(weekEnd, -1))} · {shifts.length} shifts · {totalHours.toFixed(0)}h scheduled</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/schedule?w=${weekOffset - 1}`} className="btn-outline h-9"><ChevronLeft className="w-4 h-4" /></Link>
          <Link href="/schedule" className="btn-outline h-9 text-xs">This week</Link>
          <Link href={`/schedule?w=${weekOffset + 1}`} className="btn-outline h-9"><ChevronRight className="w-4 h-4" /></Link>
          {(u.role === "ADMIN" || u.role === "MANAGER") && (
            <>
              <TemplatesButton weekStart={weekStart.toISOString().slice(0,10)} />
              <ScheduleActions weekStart={weekStart.toISOString().slice(0,10)} />
              <AutoScheduleButton locations={locations.map(l => ({ id: l.id, name: l.name }))} />
              <PublishWeekButton weekStart={weekStart.toISOString().slice(0,10)} draftCount={drafts.length} />
            </>
          )}
        </div>
      </header>

      <ScheduleControls locations={locations} totalShifts={shifts.length} openShifts={openShifts.length} drafts={drafts.length} />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-ink-200 dark:border-ink-800 bg-ink-50/60 dark:bg-ink-900/60">
              <th className="text-left p-3 w-56 font-semibold text-ink-600 dark:text-ink-400 text-[11px] uppercase tracking-wider">Employee</th>
              {days.map(d => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <th key={+d} className={`p-3 text-center font-medium ${isToday ? "text-brand-600 dark:text-brand-400" : "text-ink-700 dark:text-ink-200"}`}>
                    <div className={`text-[11px] uppercase tracking-wider ${isToday ? "text-brand-600 dark:text-brand-400 font-bold" : "text-ink-500 dark:text-ink-400"}`}>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                    <div className={`text-base ${isToday ? "inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-500 text-white" : ""}`}>{d.getDate()}</div>
                  </th>
                );
              })}
              <th className="p-3 text-right font-semibold text-ink-600 dark:text-ink-400 text-[11px] uppercase tracking-wider">Hrs</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const memberShifts = byMemberDay.get(m.id);
              const mh = shifts.filter(s => s.memberId === m.id).reduce((a, s) => a + (+s.endsAt - +s.startsAt)/3600000, 0);
              return (
                <tr key={m.id} className="border-b border-ink-100 dark:border-ink-800 hover:bg-ink-50/40 dark:hover:bg-ink-900/40">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {m.user.avatar
                        ? <img src={m.user.avatar} className="w-7 h-7 rounded-full" alt="" />
                        : <div className="w-7 h-7 rounded-full bg-ink-200 dark:bg-ink-800 text-[11px] font-semibold flex items-center justify-center">{initials(m.user.name)}</div>}
                      <div className="min-w-0">
                        <div className="font-medium truncate text-ink-900 dark:text-ink-100">{m.user.name}</div>
                        <div className="text-[11px] text-ink-500 dark:text-ink-400 truncate">{m.position} · {m.location?.name}</div>
                      </div>
                    </div>
                  </td>
                  {days.map((_, i) => {
                    const items = memberShifts?.get(i) ?? [];
                    return (
                      <td key={i} className="p-2 align-top">
                        <div className="space-y-1">
                          {items.map((s: any) => (
                            <ShiftCell
                              key={s.id}
                              canEdit={u.role === "ADMIN" || u.role === "MANAGER"}
                              members={members.map(mm => ({ id: mm.id, name: mm.user.name }))}
                              verticals={verticalOptions}
                              shift={{
                                id: s.id,
                                memberId: s.memberId,
                                memberName: s.member?.user?.name ?? null,
                                locationId: s.locationId,
                                locationName: s.location.name,
                                date: new Date(s.startsAt).toISOString().slice(0,10),
                                startTime: new Date(s.startsAt).toTimeString().slice(0,5),
                                endTime:   new Date(s.endsAt).toTimeString().slice(0,5),
                                position: s.position ?? "",
                                notes: s.notes,
                                status: s.status as "draft" | "published",
                                isOpen: s.isOpen,
                                departmentId:      (s as any).departmentId,
                                crewId:            (s as any).crewId,
                                classPeriodId:     (s as any).classPeriodId,
                                modMemberId:       (s as any).modMemberId,
                                unit:              (s as any).unit,
                                requiredSkillTier: (s as any).requiredSkillTier,
                              }}
                            />
                          ))}
                          {items.length === 0 && <div className="h-7" />}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-3 text-right font-medium text-ink-700 dark:text-ink-300">{mh.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Open Shifts ({openShifts.length})</h3>
            <Link href="/schedule" className="text-xs text-brand-600 font-medium">All open shifts →</Link>
          </div>
          <ul className="space-y-2">
            {openShifts.length === 0 && <li className="text-xs text-ink-500">None this week.</li>}
            {openShifts.map(s => (
              <li key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-ink-200 dark:border-ink-800 hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-500/10">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{s.position ?? "Open shift"}</div>
                  <div className="text-[11px] text-ink-500">{s.location.name} · {dateLabel(s.startsAt)} {timeLabel(s.startsAt)} – {timeLabel(s.endsAt)}</div>
                </div>
                <Link href="/open-shifts" className="btn-outline text-xs">Assign</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Unpublished Drafts ({drafts.length})</h3>
          <ul className="space-y-2">
            {drafts.length === 0 && <li className="text-xs text-ink-500">All shifts are published. 🎉</li>}
            {drafts.slice(0, 8).map(s => (
              <li key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50/40">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{s.member?.user.name ?? "Unassigned"} · {s.position}</div>
                  <div className="text-[11px] text-ink-500">{s.location.name} · {dateLabel(s.startsAt)} {timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}</div>
                </div>
                <span className="badge bg-amber-100 text-amber-800">Draft</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
