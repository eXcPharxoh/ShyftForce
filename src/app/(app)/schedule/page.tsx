import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, fmtMoney, initials, startOfWeek, timeLabel } from "@/lib/utils";
import { ScheduleControls } from "@/components/schedule/schedule-controls";
import { AutoScheduleButton } from "@/components/schedule/auto-schedule-button";
import { ScheduleActions } from "@/components/schedule/schedule-actions";
import { PublishWeekButton } from "@/components/schedule/publish-week-button";
import { TemplatesButton } from "@/components/schedule/templates-button";
import { ShiftCell } from "@/components/schedule/shift-cell";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";

const PALETTE = ["#6aa2ff", "#4ee0c5", "#f5b544", "#f17a8e", "#a78bff", "#8db9ff"];
function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ w?: string; v?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const weekOffset = parseInt(sp.w ?? "0", 10);
  const view = (sp.v ?? "position") as "position" | "employee";
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
  const verticalOptions = { industry: u.organizationIndustry, departments, crews, periods };

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const totalHours = shifts.reduce((acc, s) => acc + (+s.endsAt - +s.startsAt) / 3600000, 0);
  const openShiftsList = shifts.filter(s => s.isOpen);
  const drafts = shifts.filter(s => s.status === "draft");
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const memberById = new Map(members.map(m => [m.id, m]));
  function shiftPayload(s: typeof shifts[number]) {
    return {
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
    };
  }
  const membersList = members.map(mm => ({ id: mm.id, name: mm.user.name }));

  // Per-day totals (hours + cost)
  const dayTotals = days.map((_, di) => {
    const dayShifts = shifts.filter(s => {
      const idx = Math.floor((+s.startsAt - +weekStart) / 86400000);
      return idx === di && s.memberId;
    });
    const hours = dayShifts.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600_000, 0);
    const cost  = dayShifts.reduce((a, s) => a + ((+s.endsAt - +s.startsAt) / 3600_000) * (memberById.get(s.memberId!)?.hourlyRate ?? 0), 0);
    return { hours, cost };
  });

  // High-demand days (Fri/Sat for now — eventually from DemandForecast)
  function isHotDay(d: Date) { return d.getDay() === 5 || d.getDay() === 6; }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500 mb-1">Schedule</div>
          <h1 className="h-page">Week of {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</h1>
          <p className="text-[13px] text-ink-300 mt-0.5">
            {dateLabel(weekStart)} → {dateLabel(addDays(weekEnd, -1))} · {shifts.length} shifts · {totalHours.toFixed(0)}h
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/schedule?w=${weekOffset - 1}&v=${view}`} className="btn-ghost btn-sm"><ChevronLeft className="w-3.5 h-3.5" /></Link>
          <Link href={`/schedule?v=${view}`} className="btn-ghost btn-sm">Today</Link>
          <Link href={`/schedule?w=${weekOffset + 1}&v=${view}`} className="btn-ghost btn-sm"><ChevronRight className="w-3.5 h-3.5" /></Link>
          {isManager && (
            <>
              <TemplatesButton weekStart={weekStart.toISOString().slice(0,10)} />
              <ScheduleActions weekStart={weekStart.toISOString().slice(0,10)} />
              <AutoScheduleButton locations={locations.map(l => ({ id: l.id, name: l.name }))} />
              <PublishWeekButton weekStart={weekStart.toISOString().slice(0,10)} draftCount={drafts.length} />
            </>
          )}
        </div>
      </header>

      {/* View switcher */}
      <div className="flex items-center gap-2">
        <div className="inline-flex p-1 bg-white/[0.03] border border-white/[0.06] rounded-md">
          {[
            { v: "position", l: "By position" },
            { v: "employee", l: "By employee" },
          ].map(t => (
            <Link
              key={t.v}
              href={`/schedule?w=${weekOffset}&v=${t.v}`}
              className={`px-3 py-1.5 rounded-sm text-[12px] font-medium transition ${
                view === t.v ? "bg-brand-500/12 text-brand-300" : "text-ink-300 hover:text-ink-50"
              }`}
            >
              {t.l}
            </Link>
          ))}
        </div>
        <ScheduleControls locations={locations} totalShifts={shifts.length} openShifts={openShiftsList.length} drafts={drafts.length} />
      </div>

      {/* GRID */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left p-3 w-[200px] font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
                {view === "position" ? "Position group" : "Employee"}
              </th>
              {days.map(d => {
                const isToday = d.toDateString() === new Date().toDateString();
                const hot = isHotDay(d);
                return (
                  <th key={+d} className="p-3 text-center font-medium min-w-[140px]">
                    <div className={`text-[10px] uppercase tracking-[0.12em] font-mono ${hot ? "text-warn" : "text-ink-500"}`}>
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                      {hot && <span className="ml-1 inline-flex items-center"><Flame className="w-2.5 h-2.5" /></span>}
                    </div>
                    <div className={`text-[14px] mt-0.5 ${
                      isToday
                        ? "inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-500 text-white font-semibold"
                        : "text-ink-50"
                    }`}>
                      {d.getDate()}
                    </div>
                  </th>
                );
              })}
              <th className="p-3 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500 w-[80px]">Hrs</th>
            </tr>
          </thead>
          <tbody>
            {view === "position"
              ? <PositionView shifts={shifts} memberById={memberById} days={days} weekStart={weekStart} canEdit={isManager} members={membersList} verticals={verticalOptions} payload={shiftPayload} colorForId={colorForId} />
              : <EmployeeView shifts={shifts} members={members} days={days} weekStart={weekStart} canEdit={isManager} membersList={membersList} verticals={verticalOptions} payload={shiftPayload} />
            }

            {/* Open shifts row (always shown if any) */}
            {openShiftsList.length > 0 && (
              <tr className="border-t border-white/[0.06] bg-warn/5">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-warn/15 text-warn flex items-center justify-center text-[10px] font-bold">!</div>
                    <div>
                      <div className="text-[13px] font-medium text-warn">Open shifts</div>
                      <div className="text-[10px] text-ink-500">{openShiftsList.length} unfilled</div>
                    </div>
                  </div>
                </td>
                {days.map((_, di) => {
                  const items = openShiftsList.filter(s => Math.floor((+s.startsAt - +weekStart) / 86400000) === di);
                  return (
                    <td key={di} className="p-2 align-top">
                      <div className="space-y-1">
                        {items.map(s => (
                          <ShiftCell
                            key={s.id}
                            canEdit={isManager}
                            members={membersList}
                            verticals={verticalOptions}
                            shift={shiftPayload(s)}
                          />
                        ))}
                      </div>
                    </td>
                  );
                })}
                <td className="p-3 text-right text-warn font-mono text-[12px]">—</td>
              </tr>
            )}

            {/* Totals row */}
            <tr className="border-t-2 border-white/[0.12] bg-white/[0.02]">
              <td className="p-3">
                <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-500">Day totals</div>
              </td>
              {dayTotals.map((t, di) => (
                <td key={di} className="p-3 text-center">
                  <div className="text-[13px] font-semibold text-ink-50 tabular-nums">{t.hours.toFixed(1)}h</div>
                  <div className="text-[11px] text-ink-500 font-mono tabular-nums">{fmtMoney(t.cost)}</div>
                </td>
              ))}
              <td className="p-3 text-right">
                <div className="text-[13px] font-semibold text-ink-50 tabular-nums">{totalHours.toFixed(1)}h</div>
                <div className="text-[11px] text-ink-500 font-mono tabular-nums">{fmtMoney(dayTotals.reduce((a, t) => a + t.cost, 0))}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold">Open Shifts ({openShiftsList.length})</h3>
            <Link href="/open-shifts" className="text-[12px] text-brand-300 hover:underline">All →</Link>
          </div>
          <ul className="space-y-2">
            {openShiftsList.length === 0 && <li className="text-[12px] text-ink-500">None this week.</li>}
            {openShiftsList.slice(0, 6).map(s => (
              <li key={s.id} className="flex items-center justify-between p-2.5 rounded-md bg-white/[0.02] border border-white/[0.04]">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{s.position ?? "Open shift"}</div>
                  <div className="text-[11px] text-ink-500">{s.location.name} · {dateLabel(s.startsAt)} {timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}</div>
                </div>
                <Link href="/open-shifts" className="btn-ghost btn-sm">Assign</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <h3 className="text-[13px] font-semibold mb-3">Unpublished Drafts ({drafts.length})</h3>
          <ul className="space-y-2">
            {drafts.length === 0 && <li className="text-[12px] text-ink-500">All shifts are published.</li>}
            {drafts.slice(0, 6).map(s => (
              <li key={s.id} className="flex items-center justify-between p-2.5 rounded-md bg-warn/8 border border-warn/20">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{s.member?.user.name ?? "Unassigned"} · {s.position}</div>
                  <div className="text-[11px] text-ink-500">{s.location.name} · {dateLabel(s.startsAt)} {timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}</div>
                </div>
                <span className="status status-warn">Draft</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ============================================================================
   POSITION VIEW — design spec default
   ============================================================================ */
function PositionView({
  shifts, memberById, days, weekStart, canEdit, members, verticals, payload, colorForId,
}: any) {
  // Group shifts by position
  const byPos = new Map<string, any[]>();
  for (const s of shifts) {
    if (!s.memberId) continue;
    const pos = s.position ?? "(no position)";
    if (!byPos.has(pos)) byPos.set(pos, []);
    byPos.get(pos)!.push(s);
  }
  const positions = Array.from(byPos.keys()).sort();

  if (positions.length === 0) {
    return (
      <tr><td colSpan={9} className="p-12 text-center text-ink-500 text-sm">No assigned shifts this week.</td></tr>
    );
  }

  return (
    <>
      {positions.map((pos, pi) => {
        const posShifts = byPos.get(pos)!;
        const ph = posShifts.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600_000, 0);
        const tone = PALETTE[pi % PALETTE.length];

        return (
          <tr key={pos} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
            <td className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-8 rounded-full" style={{ background: tone }} />
                <div>
                  <div className="text-[13px] font-semibold text-ink-50">{pos}</div>
                  <div className="text-[10.5px] text-ink-500">{posShifts.length} shift{posShifts.length === 1 ? "" : "s"}</div>
                </div>
              </div>
            </td>
            {days.map((_: any, di: number) => {
              const items = posShifts.filter(s => Math.floor((+s.startsAt - +weekStart) / 86400000) === di);
              return (
                <td key={di} className="p-2 align-top">
                  <div className="space-y-1">
                    {items.map((s: any) => {
                      const m = memberById.get(s.memberId);
                      const color = m ? colorForId(m.id) : "#6aa2ff";
                      const startTime = new Date(s.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                      const endTime   = new Date(s.endsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                      return (
                        <PositionShiftCell
                          key={s.id}
                          memberName={m?.user.name ?? "—"}
                          color={color}
                          startTime={startTime}
                          endTime={endTime}
                          isDraft={s.status === "draft"}
                          canEdit={canEdit}
                          members={members}
                          verticals={verticals}
                          payload={payload(s)}
                        />
                      );
                    })}
                  </div>
                </td>
              );
            })}
            <td className="p-3 text-right text-[12px] text-ink-300 tabular-nums">{ph.toFixed(1)}</td>
          </tr>
        );
      })}
    </>
  );
}

/* ============================================================================
   EMPLOYEE VIEW — back-compat
   ============================================================================ */
function EmployeeView({ shifts, members, days, weekStart, canEdit, membersList, verticals, payload }: any) {
  return (
    <>
      {members.map((m: any) => {
        const memberShifts = new Map<number, any[]>();
        for (const s of shifts) {
          if (s.memberId !== m.id) continue;
          const idx = Math.floor((+s.startsAt - +weekStart) / 86400000);
          if (!memberShifts.has(idx)) memberShifts.set(idx, []);
          memberShifts.get(idx)!.push(s);
        }
        const mh = shifts.filter((s: any) => s.memberId === m.id).reduce((a: number, s: any) => a + (+s.endsAt - +s.startsAt)/3600000, 0);
        return (
          <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
            <td className="p-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${colorForId(m.id)}, color-mix(in srgb, ${colorForId(m.id)} 40%, #000))` }}
                >
                  {initials(m.user.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink-50 truncate">{m.user.name}</div>
                  <div className="text-[10.5px] text-ink-500 truncate">{m.position} · {m.location?.name}</div>
                </div>
              </div>
            </td>
            {days.map((_: any, i: number) => {
              const items = memberShifts.get(i) ?? [];
              return (
                <td key={i} className="p-2 align-top">
                  <div className="space-y-1">
                    {items.map((s: any) => (
                      <ShiftCell
                        key={s.id}
                        canEdit={canEdit}
                        members={membersList}
                        verticals={verticals}
                        shift={payload(s)}
                      />
                    ))}
                  </div>
                </td>
              );
            })}
            <td className="p-3 text-right text-[12px] text-ink-300 tabular-nums">{mh.toFixed(1)}</td>
          </tr>
        );
      })}
    </>
  );
}

/* ============================================================================
   PositionShiftCell — gradient block by employee color with name + time
   ============================================================================ */
function PositionShiftCell({ memberName, color, startTime, endTime, isDraft, canEdit, members, verticals, payload }: any) {
  // Re-use the existing edit dialog via ShiftCell with custom styling
  return (
    <div className="relative">
      <ShiftCell canEdit={canEdit} members={members} verticals={verticals} shift={payload} />
    </div>
  );
}
