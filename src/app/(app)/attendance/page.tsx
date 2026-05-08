import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel, fmtHours, fmtMoney, initials, timeLabel } from "@/lib/utils";
import { ClockButton } from "@/components/attendance/clock-button";
import { TimesheetActions } from "@/components/attendance/timesheet-actions";
import Link from "next/link";

export default async function AttendancePage() {
  const u = await requireUser();
  const orgId = u.organizationId;

  const [period, members, allLogs] = await Promise.all([
    prisma.payPeriod.findFirst({
      where: { organizationId: orgId, status: "open" },
      include: {
        entries: { include: { member: { include: { user: true, location: true } } } },
      },
    }),
    prisma.member.findMany({ where: { organizationId: orgId, status: "active" }, include: { user: true, location: true } }),
    prisma.attendanceLog.findMany({ where: { member: { organizationId: orgId } }, orderBy: { at: "asc" } }),
  ]);

  // current status per member
  const status = new Map<string, { state: "in" | "break" | "out"; since: Date }>();
  for (const l of allLogs) {
    const cur = status.get(l.memberId);
    if (l.type === "clock_in") status.set(l.memberId, { state: "in", since: l.at });
    else if (l.type === "break_start") status.set(l.memberId, { state: "break", since: l.at });
    else if (l.type === "break_end" && cur) status.set(l.memberId, { state: "in", since: l.at });
    else if (l.type === "clock_out") status.set(l.memberId, { state: "out", since: l.at });
  }

  const me = members.find(m => m.userId === u.id);
  const myState = me ? status.get(me.id)?.state ?? "out" : "out";

  const entries = period?.entries ?? [];
  const totalHours = entries.reduce((a, e) => a + e.hours, 0);
  const totalCost = entries.reduce((a, e) => a + e.hours * (e.member.hourlyRate ?? 0), 0);
  const flagged = entries.filter(e => e.flagged).length;
  const unapproved = entries.filter(e => !e.approved).length;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance & Payroll</h1>
          <p className="text-sm text-ink-500">
            {period ? `Pay period: ${dateLabel(period.startsOn)} → ${dateLabel(period.endsOn)}` : "No active pay period"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="#tipping" className="btn-outline">Tip Management</Link>
          <button className="btn-primary">Run payroll</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Stat label="Hours this period" value={fmtHours(totalHours)} />
        <Stat label="Estimated payroll" value={fmtMoney(totalCost)} />
        <Stat label="Flagged entries" value={flagged} tone="rose" />
        <Stat label="Unapproved" value={unapproved} tone="amber" />
      </div>

      {me && (
        <section className="card p-5">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-xs uppercase text-ink-500 font-medium tracking-wide">Your shift</div>
              <h3 className="text-lg font-semibold">{me.user.name}</h3>
              <div className="text-xs text-ink-500">{me.position} · {me.location?.name}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase text-ink-500">Status</div>
              <div className="text-base font-bold">
                {myState === "in" && <span className="text-emerald-600">● Working</span>}
                {myState === "break" && <span className="text-amber-600">● On break</span>}
                {myState === "out" && <span className="text-ink-500">● Off duty</span>}
              </div>
            </div>
            <ClockButton memberId={me.id} state={myState} />
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Timesheet entries</h3>
            <p className="text-[11px] text-ink-500">Approve, flag, or send a reminder.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="badge-orange">{flagged} flagged</span>
            <span className="badge bg-amber-100 text-amber-800">{unapproved} unapproved</span>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 text-[11px] uppercase text-ink-600">
              <tr>
                <th className="text-left px-4 py-2">Employee</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Location</th>
                <th className="text-right px-4 py-2">Hours</th>
                <th className="text-right px-4 py-2">Cost</th>
                <th className="text-center px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 60).map(e => (
                <tr key={e.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {e.member.user.avatar
                        ? <img src={e.member.user.avatar} alt="" className="w-6 h-6 rounded-full" />
                        : <div className="w-6 h-6 rounded-full bg-ink-200 text-[10px] font-semibold flex items-center justify-center">{initials(e.member.user.name)}</div>}
                      <span className="font-medium">{e.member.user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-ink-600">{dateLabel(e.date)}</td>
                  <td className="px-4 py-2 text-ink-600">{e.member.location?.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{e.hours.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(e.hours * (e.member.hourlyRate ?? 0))}</td>
                  <td className="px-4 py-2 text-center">
                    {e.flagged ? <span className="badge bg-rose-50 text-rose-700">Flagged</span>
                      : e.approved ? <span className="badge bg-emerald-50 text-emerald-700">Approved</span>
                      : <span className="badge bg-amber-50 text-amber-700">Pending</span>}
                  </td>
                  <td className="px-4 py-2 text-right"><TimesheetActions entryId={e.id} approved={e.approved} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="tipping" className="card p-5">
        <h3 className="text-sm font-semibold mb-1">Tip Management</h3>
        <p className="text-xs text-ink-500 mb-3">Automated calculation & distribution. Configure your pool rules and let the engine handle the rest.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Pool method", "Hours-weighted"],
            ["Frequency", "Per pay period"],
            ["Distributed last period", "$3,420.50"],
            ["Pending distribution", "$1,184.20"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-ink-200 p-3">
              <div className="text-[11px] uppercase text-ink-500 font-medium">{k}</div>
              <div className="text-base font-semibold mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone = "ink" }: { label: string; value: string | number; tone?: "ink" | "rose" | "amber" }) {
  const map: any = { ink: "text-ink-900", rose: "text-rose-600", amber: "text-amber-600" };
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${map[tone]}`}>{value}</div>
    </div>
  );
}
