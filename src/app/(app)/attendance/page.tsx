import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel, fmtHours, fmtMoney, initials, timeLabel } from "@/lib/utils";
import { fmtDistance } from "@/lib/geo";
import { ClockButton } from "@/components/attendance/clock-button";
import { TimesheetActions } from "@/components/attendance/timesheet-actions";
import { RunPayrollButton } from "@/components/attendance/run-payroll-button";
import Link from "next/link";
import { MapPin, ShieldCheck, AlertTriangle, Camera, Clock as ClockIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default async function AttendancePage() {
  const u = await requireUser();
  const orgId = u.organizationId;

  const [period, members, allLogs, recentLogs, org] = await Promise.all([
    prisma.payPeriod.findFirst({
      where: { organizationId: orgId, status: "open" },
      include: {
        entries: { include: { member: { include: { user: true, location: true } } } },
      },
    }),
    prisma.member.findMany({ where: { organizationId: orgId, status: "active" }, include: { user: true, location: true } }),
    prisma.attendanceLog.findMany({ where: { member: { organizationId: orgId } }, orderBy: { at: "asc" } }),
    prisma.attendanceLog.findMany({
      where: { member: { organizationId: orgId } },
      orderBy: { at: "desc" }, take: 12,
      include: { member: { include: { user: true, location: true } } },
    }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { finchAccessToken: true } }),
  ]);
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

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
      <PageHeader
        eyebrow="Time tracking"
        icon={ClockIcon}
        title="Attendance & Payroll"
        subtitle={period ? `Pay period · ${dateLabel(period.startsOn)} → ${dateLabel(period.endsOn)}` : "No active pay period"}
      >
        <Link href="#tipping" className="btn-outline">Tip Management</Link>
        {isManager && (
          <RunPayrollButton
            finchConnected={!!org?.finchAccessToken}
            payPeriodId={period?.id ?? null}
            unapprovedCount={unapproved}
          />
        )}
      </PageHeader>

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
            <ClockButton
              memberId={me.id}
              state={myState}
              assignedLocation={me.location ? {
                name: me.location.name,
                latitude: me.location.latitude,
                longitude: me.location.longitude,
                geofenceRadiusMeters: me.location.geofenceRadiusMeters ?? 100,
              } : null}
            />
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
                <tr key={e.id} className="border-t border-ink-100 dark:border-ink-800 hover:bg-ink-50/40 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {e.member.user.avatar
                        ? <img src={e.member.user.avatar} alt="" className="w-6 h-6 rounded-full" />
                        : <div className="w-6 h-6 rounded-full bg-ink-200 dark:bg-ink-800 text-ink-700 dark:text-ink-300 text-[10px] font-semibold flex items-center justify-center">{initials(e.member.user.name)}</div>}
                      <span className="font-medium text-ink-900 dark:text-ink-100">{e.member.user.name}</span>
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

      {isManager && (
        <section className="card overflow-hidden">
          <header className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand-500" /> Clock-in proof</h3>
              <p className="text-[11px] text-ink-500">Recent events with GPS + selfie verification.</p>
            </div>
            <span className="badge bg-emerald-50 text-emerald-700">{recentLogs.filter(l => l.verified).length} of {recentLogs.length} verified</span>
          </header>
          <ul className="divide-y divide-ink-100">
            {recentLogs.length === 0 && <li className="p-6 text-center text-sm text-ink-500">No clock events yet.</li>}
            {recentLogs.map(l => (
              <li key={l.id} className="px-5 py-3 flex items-center gap-3">
                {l.photoData
                  ? <img src={l.photoData} alt="" className="w-12 h-12 rounded-lg object-cover border border-ink-200" />
                  : <div className="w-12 h-12 rounded-lg bg-ink-100 text-ink-400 flex items-center justify-center"><Camera className="w-5 h-5" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{l.member.user.name}</span>
                    <span className="text-ink-500"> · {labelForType(l.type)}</span>
                    <span className="text-[11px] text-ink-400 ml-2">{l.at.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span>
                  </div>
                  <div className="text-[11px] text-ink-500 truncate flex items-center gap-1">
                    {l.member.location?.name ?? "—"}
                    {l.distanceMeters != null && <>
                      <span className="mx-1">·</span>
                      <MapPin className="w-3 h-3" /> {fmtDistance(l.distanceMeters)} from site
                    </>}
                  </div>
                </div>
                <div className="text-right text-[11px] shrink-0">
                  {l.withinGeofence === true   && <span className="badge bg-emerald-50 text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> in geofence</span>}
                  {l.withinGeofence === false  && <span className="badge bg-amber-50 text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> outside</span>}
                  {l.withinGeofence == null    && <span className="badge-gray">unverified</span>}
                  {l.latitude != null && l.longitude != null && (
                    <a className="block mt-1 text-brand-600 hover:underline" target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`}>view on map ↗</a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
  const map: any = { ink: "text-ink-900 dark:text-ink-50", rose: "text-rose-600 dark:text-rose-400", amber: "text-amber-600 dark:text-amber-300" };
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${map[tone]}`}>{value}</div>
    </div>
  );
}

function labelForType(t: string): string {
  switch (t) {
    case "clock_in":    return "clocked in";
    case "clock_out":   return "clocked out";
    case "break_start": return "started break";
    case "break_end":   return "ended break";
    default:            return t;
  }
}
