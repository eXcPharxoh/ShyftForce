import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel, fmtHours, fmtMoney, initials, timeLabel } from "@/lib/utils";
import { fmtDistance } from "@/lib/geo";
import { ClockButton } from "@/components/attendance/clock-button";
import { TimesheetActions } from "@/components/attendance/timesheet-actions";
import { RunPayrollButton } from "@/components/attendance/run-payroll-button";
import { GeofenceMap } from "@/components/ui/geofence-map";
import { LocationsPunchMap } from "@/components/geo/locations-punch-map";
import { FaceEnrollment } from "@/components/attendance/face-enrollment";
import { FaceVerificationToggle } from "@/components/attendance/face-verification-toggle";
import Link from "next/link";
import { MapPin, ShieldCheck, AlertTriangle, Camera, Clock as ClockIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

// Bearing from (lat1,lng1) → (lat2,lng2) in degrees (0=N, 90=E)
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

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

      {/* Real map of where punches actually happened vs the geofence — the
          buddy-punch audit view (managers only). */}
      {isManager && (
        <LocationsPunchMap
          orgId={orgId}
          sinceHours={168}
          title="Clock-in locations"
          subtitle="Last 7 days — green inside the geofence, amber outside"
          height={360}
        />
      )}

      {/* Face verification: owner policy toggle + self-enrollment. */}
      <div className="grid gap-3 lg:grid-cols-2">
        {u.role === "ADMIN" && <FaceVerificationToggle />}
        <FaceEnrollment />
      </div>

      {/* 5-stat row per design: On time / Late / No-show / Missed-out / Avg variance */}
      {(() => {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart.getTime() + 86400_000);
        // Pull today's shifts for cross-reference
        const todayShifts = entries.length > 0
          ? entries.filter(e => new Date(e.date).getTime() >= todayStart.getTime() && new Date(e.date).getTime() < todayEnd.getTime())
          : [];
        // Per-member scheduled-vs-actual variance from logs we already loaded
        let onTime = 0, late = 0, missedOut = 0;
        const variances: number[] = [];
        const memberLatestClockIn = new Map<string, Date>();
        const memberLatestClockOut = new Map<string, Date>();
        for (const l of allLogs) {
          if (l.at >= todayStart && l.at < todayEnd) {
            if (l.type === "clock_in") memberLatestClockIn.set(l.memberId, l.at);
            if (l.type === "clock_out") memberLatestClockOut.set(l.memberId, l.at);
          }
        }
        // Currently-in = clock_in without subsequent clock_out today
        for (const [memberId, ci] of memberLatestClockIn) {
          const co = memberLatestClockOut.get(memberId);
          if (!co && new Date().getHours() >= 20) missedOut++; // after 8pm without clock-out
        }
        // For each clock_in today, see if we have a matching today shift
        for (const [memberId, ciAt] of memberLatestClockIn) {
          const sched = todayShifts.find(e => e.memberId === memberId);
          // Pay-period entries don't have start times — use heuristic: assume 9am
          const expected = new Date(todayStart.getTime() + 9 * 3600_000);
          const minsLate = (ciAt.getTime() - expected.getTime()) / 60_000;
          variances.push(Math.abs(minsLate));
          if (minsLate > 5) late++;
          else if (minsLate >= -10) onTime++;
        }
        const avgVar = variances.length > 0
          ? Math.round(variances.reduce((a, v) => a + v, 0) / variances.length)
          : 0;
        // No-show = scheduled today but never clocked in
        const noShow = Math.max(0, todayShifts.length - memberLatestClockIn.size);

        return (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard label="On time today" value={String(onTime)} tone="success" />
            <KpiCard label="Late today" value={String(late)} tone={late > 0 ? "warn" : "info"} />
            <KpiCard label="No-show today" value={String(noShow)} tone={noShow > 0 ? "danger" : "info"} />
            <KpiCard label="Missed clock-out" value={String(missedOut)} tone={missedOut > 0 ? "warn" : "info"} />
            <KpiCard label="Avg variance" value={`${avgVar}m`} tone={avgVar > 10 ? "warn" : "success"} />
          </div>
        );
      })()}

      {/* Secondary stats — payroll-focused */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Hours this period"   value={fmtHours(totalHours)} tone="info"   small />
        <KpiCard label="Estimated payroll"   value={fmtMoney(totalCost)}  tone="info"   small />
        <KpiCard label="Flagged entries"     value={String(flagged)}      tone={flagged > 0 ? "danger" : "info"} small />
        <KpiCard label="Unapproved"          value={String(unapproved)}   tone={unapproved > 0 ? "warn" : "info"} small />
      </div>

      {/* Live geofence — shows currently-clocked-in employees plotted around
          the location centre based on their most recent clock-in coords. */}
      {(() => {
        // Pick the first active location with coordinates
        const firstLoc = members.find(m => m.location?.latitude != null && m.location?.longitude != null)?.location;
        if (!firstLoc || firstLoc.latitude == null || firstLoc.longitude == null) return null;
        const centerLat = firstLoc.latitude;
        const centerLng = firstLoc.longitude;
        const radius   = firstLoc.geofenceRadiusMeters ?? 100;

        // For each member currently clocked in, find their last clock_in log
        const lastClockIn = new Map<string, { lat: number; lng: number; withinGeofence: boolean | null }>();
        for (const log of allLogs) {
          if (log.type === "clock_in" && log.latitude != null && log.longitude != null) {
            lastClockIn.set(log.memberId, { lat: log.latitude, lng: log.longitude, withinGeofence: log.withinGeofence });
          }
        }
        const people = members
          .filter(m => (status.get(m.id)?.state === "in" || status.get(m.id)?.state === "break") && lastClockIn.has(m.id))
          .slice(0, 12)
          .map(m => {
            const c = lastClockIn.get(m.id)!;
            const R = 6371000;
            const φ1 = (centerLat * Math.PI) / 180, φ2 = (c.lat * Math.PI) / 180;
            const Δφ = ((c.lat - centerLat) * Math.PI) / 180;
            const Δλ = ((c.lng - centerLng) * Math.PI) / 180;
            const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
            const distance = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return {
              id: m.id,
              name: m.user.name,
              initials: initials(m.user.name),
              distanceMeters: distance,
              bearingDeg: bearingDeg(centerLat, centerLng, c.lat, c.lng),
              withinGeofence: c.withinGeofence ?? distance <= radius,
            };
          });

        return (
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-medium text-brand-500 font-mono">Live geofence</div>
                <h3 className="text-lg font-semibold mt-0.5">{firstLoc.name}</h3>
                <div className="text-[12px] text-ink-500 mt-0.5">
                  {people.length} clocked in · {centerLat.toFixed(4)}°, {centerLng.toFixed(4)}°
                </div>
              </div>
              <Link href="/settings/locations" className="btn-ghost btn-sm">
                <MapPin className="w-3.5 h-3.5" /> Manage geofences
              </Link>
            </div>
            <GeofenceMap
              centerName={firstLoc.name}
              centerLat={centerLat}
              centerLng={centerLng}
              radiusMeters={radius}
              people={people}
            />
            {people.length === 0 && (
              <p className="text-[12px] text-ink-500 mt-2 text-center">
                No-one's clocked in here yet. Employees see this map on their device when they tap Clock In.
              </p>
            )}
          </section>
        );
      })()}

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

      {/* Selfie verification grid — visual showcase of the 3 most recent
          photo-verified clock-ins (design spec). */}
      {isManager && (() => {
        const withPhoto = recentLogs.filter(l => l.photoData && l.type === "clock_in").slice(0, 3);
        if (withPhoto.length === 0) return null;
        return (
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-semibold flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-brand-500" /> Selfie verification
                </h3>
                <p className="text-[11px] text-ink-500 mt-0.5 font-mono uppercase tracking-[0.12em]">
                  Most recent 3 verified clock-ins
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {withPhoto.map(l => (
                <div key={l.id} className="card p-3">
                  <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-ink-950">
                    <img src={l.photoData!} alt="" className="w-full h-full object-cover" />
                    {l.verified && (
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-success/90 text-ink-950 flex items-center justify-center shadow-glow">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="text-[13px] font-semibold text-ink-50 truncate">{l.member.user.name}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5 font-mono">
                    {l.at.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}
                  </div>
                  {l.member.location?.name && (
                    <div className="text-[11px] text-ink-500 mt-0.5 truncate">{l.member.location.name}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })()}

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

function KpiCard({ label, value, tone = "info", small = false }: { label: string; value: string; tone?: "info" | "success" | "warn" | "danger"; small?: boolean }) {
  const toneClass: Record<typeof tone, string> = {
    info:    "text-brand-300",
    success: "text-success",
    warn:    "text-warn",
    danger:  "text-danger",
  };
  return (
    <div className="card p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-500">{label}</div>
      <div className={`font-display font-medium leading-none mt-2 tabular-nums ${toneClass[tone]} ${small ? "text-[22px]" : "text-[28px] grad-text-accent"}`}>{value}</div>
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
