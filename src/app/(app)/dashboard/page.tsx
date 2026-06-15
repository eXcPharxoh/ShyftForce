import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, fmtMoney, initials, startOfWeek } from "@/lib/utils";
import { HomeShell, type RosterEntry, type ActivityEntry, type CopilotSuggestion } from "@/components/dashboard/home-shell";
import { VerticalWidgets } from "@/components/dashboard/vertical-widgets";
import { TurnoverWidget } from "@/components/dashboard/turnover-widget";
import { PermitExpiryWidget } from "@/components/dashboard/permit-expiry-widget";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { LocationsPunchMap } from "@/components/geo/locations-punch-map";
import { PendingOnboardingWidget } from "@/components/dashboard/pending-onboarding-widget";
import { QuietDayOne } from "@/components/dashboard/quiet-day-one";
import { EmployeeHome } from "@/components/dashboard/employee-home";

export const dynamic = "force-dynamic";

// Color palette for member avatar gradients — keyed by member id hash
const PALETTE = ["#6aa2ff", "#4ee0c5", "#f5b544", "#f17a8e", "#a78bff", "#8db9ff"];
function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default async function Dashboard() {
  const u = await requireUser();
  const orgId = u.organizationId;
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart.getTime() + 86400_000);
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);

  // Greeting based on local time
  const h = now.getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

  // ─── Employee branch ───────────────────────────────────────────────────────
  // Non-managers don't need labor cost, compliance %, the punch map, or any of
  // the operational widgets. They get a focused view of their next shift, any
  // urgent coverage offers, and quick links to clock in / time off / messages.
  // Render early so we skip the heavy manager-aggregation queries entirely.
  if (u.role === "EMPLOYEE" && u.memberId) {
    const inTwoWeeks = addDays(now, 14);
    const [myUpcoming, myOffers, myPendingTimeOff] = await Promise.all([
      prisma.shift.findMany({
        where: { memberId: u.memberId, startsAt: { gte: now, lt: inTwoWeeks } },
        orderBy: { startsAt: "asc" },
        take: 6,
        include: { location: { select: { name: true } } },
      }),
      prisma.openShiftOffer.findMany({
        where: { memberId: u.memberId, status: "pending", expiresAt: { gt: now } },
        orderBy: { expiresAt: "asc" },
        take: 5,
        include: { shift: { include: { location: { select: { name: true } } } } },
      }),
      prisma.timeOffRequest.count({
        where: { memberId: u.memberId, status: "pending" },
      }),
    ]);
    return (
      <EmployeeHome
        name={u.name}
        greeting={greeting}
        nextShift={myUpcoming[0] ? {
          id: myUpcoming[0].id,
          startsAt: myUpcoming[0].startsAt.toISOString(),
          endsAt: myUpcoming[0].endsAt.toISOString(),
          position: myUpcoming[0].position ?? null,
          locationName: myUpcoming[0].location?.name ?? null,
        } : null}
        upcomingShifts={myUpcoming.map(s => ({
          id: s.id,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          position: s.position ?? null,
          locationName: s.location?.name ?? null,
        }))}
        pendingOffers={myOffers.filter(o => o.shift).map(o => ({
          id: o.id,
          shiftStartsAt: o.shift!.startsAt.toISOString(),
          shiftEndsAt:   o.shift!.endsAt.toISOString(),
          shiftPosition: o.shift!.position ?? null,
          locationName:  o.shift!.location?.name ?? null,
          expiresAt:     o.expiresAt.toISOString(),
        }))}
        pendingTimeOffCount={myPendingTimeOff}
      />
    );
  }
  // ──────────────────────────────────────────────────────────────────────────

  const [
    locations,
    members,
    todayShifts,
    weekShifts,
    openShifts,
    allLogs,
    period,
    recentLogs,
    recentOffers,
  ] = await Promise.all([
    prisma.location.findMany({ where: { organizationId: orgId } }),
    prisma.member.findMany({
      where: { organizationId: orgId, status: "active" },
      include: { user: true, location: true },
    }),
    prisma.shift.findMany({
      where: {
        location: { organizationId: orgId },
        startsAt: { gte: todayStart, lt: tomorrow },
      },
      include: { member: { include: { user: true } }, location: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.shift.findMany({
      where: {
        location: { organizationId: orgId },
        startsAt: { gte: weekStart, lt: weekEnd },
        memberId: { not: null },
      },
    }),
    prisma.shift.count({ where: { isOpen: true, location: { organizationId: orgId }, startsAt: { gte: now } } }),
    // Bounded to the last 36h: enough to resolve current clock-in status
    // (incl. overnight shifts) without scanning the org's entire attendance
    // history on every dashboard load. Uses the AttendanceLog(at) index.
    prisma.attendanceLog.findMany({
      where: { member: { organizationId: orgId }, at: { gte: new Date(now.getTime() - 36 * 3600_000) } },
      orderBy: { at: "asc" },
    }),
    prisma.payPeriod.findFirst({ where: { organizationId: orgId, status: "open" }, include: { entries: true } }),
    prisma.attendanceLog.findMany({
      where: { member: { organizationId: orgId }, at: { gte: addDays(now, -1) } },
      orderBy: { at: "desc" }, take: 10,
      include: { member: { include: { user: true, location: true } } },
    }),
    prisma.openShiftOffer.findMany({
      where: { shift: { location: { organizationId: orgId } }, sentAt: { gte: addDays(now, -1) } },
      orderBy: { sentAt: "desc" }, take: 6,
      include: { member: { include: { user: true } }, shift: true },
    }),
  ]);

  // ---------- KPIs ----------
  // Current member status from logs
  const memberStatus = new Map<string, "in" | "break" | "out">();
  for (const l of allLogs) {
    if (l.type === "clock_in") memberStatus.set(l.memberId, "in");
    else if (l.type === "break_start") memberStatus.set(l.memberId, "break");
    else if (l.type === "break_end") memberStatus.set(l.memberId, "in");
    else if (l.type === "clock_out") memberStatus.set(l.memberId, "out");
  }
  const clockedInNow = [...memberStatus.values()].filter(v => v === "in" || v === "break").length;

  // Labor cost today = hourly rate * (now - clock-in) for currently clocked-in folks +
  // entries from today's pay period
  const todayEntries = (period?.entries ?? []).filter(e => new Date(e.date).getTime() >= todayStart.getTime() && new Date(e.date).getTime() < tomorrow.getTime());
  const laborToday = todayEntries.reduce((a, e) => a + e.hours * (members.find(m => m.id === e.memberId)?.hourlyRate ?? 0), 0);

  // Compliance % — cheap heuristic derived from the week's open predictability
  // events vs total assigned shifts. We DON'T run the full engine here (heavy);
  // instead we count flagged events that the manager hasn't resolved yet.
  // Returns null when there's no data so the UI can show "—" instead of a
  // misleading "100%".
  const weeklyShiftCount = weekShifts.length;
  const openPredictability = await prisma.predictabilityPayEvent.count({
    where: { organizationId: orgId, resolvedAt: null, occurredAt: { gte: weekStart, lt: weekEnd } },
  }).catch(() => 0);
  const compliancePct = weeklyShiftCount === 0
    ? null
    : Math.max(0, Math.round(100 * (1 - openPredictability / weeklyShiftCount)));

  // ---------- Roster (today, scheduled or in-progress) ----------
  const roster: RosterEntry[] = todayShifts
    .filter(s => s.memberId && s.member)
    .map(s => ({
      id: s.id,
      memberId: s.memberId!,
      name: s.member!.user.name,
      initials: initials(s.member!.user.name),
      color: colorForId(s.memberId!),
      position: s.position ?? "Shift",
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      status: (memberStatus.get(s.memberId!) ?? "scheduled") as RosterEntry["status"],
    }));

  // ---------- Activity feed ----------
  const activity: ActivityEntry[] = [
    ...recentLogs.map(l => ({
      id: `log-${l.id}`,
      kind: (l.type === "clock_in" || l.type === "break_end") ? "clock_in" as const : "clock_out" as const,
      message: `${l.member.user.name} ${l.type === "clock_in" ? "clocked in" : l.type === "clock_out" ? "clocked out" : l.type === "break_start" ? "started break" : "back from break"}${l.member.location?.name ? ` at ${l.member.location.name}` : ""}`,
      at: l.at.toISOString(),
    })),
    ...recentOffers.map(o => ({
      id: `offer-${o.id}`,
      kind: o.status === "claimed" ? "claim" as const : "copilot" as const,
      message: o.status === "claimed"
        ? `${o.member.user.name} claimed an open shift${o.shift?.position ? ` (${o.shift.position})` : ""}`
        : `Open-shift offer sent to ${o.member.user.name}`,
      at: o.sentAt.toISOString(),
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 10);

  // ---------- Co-pilot suggestions (rule-based for now) ----------
  const suggestions: CopilotSuggestion[] = [];
  if (openShifts > 0) {
    suggestions.push({
      id: "open-shifts",
      title: `${openShifts} open shift${openShifts === 1 ? "" : "s"} need a body`,
      body: `Top candidate is ready. Auto-offer with one click — first-respond-wins.`,
      ctaLabel: "Open shifts",
      ctaHref: "/open-shifts",
    });
  }
  if ((period?.entries.filter(e => !e.approved).length ?? 0) > 0) {
    const n = period!.entries.filter(e => !e.approved).length;
    suggestions.push({
      id: "approvals",
      title: `${n} timesheet${n === 1 ? "" : "s"} pending approval`,
      body: `Approve in bulk if they look clean. Flagged entries surface for review.`,
      ctaLabel: "Review",
      ctaHref: "/attendance",
    });
  }
  if (suggestions.length < 3) {
    suggestions.push({
      id: "review",
      title: "Run a quick compliance check",
      body: "Pre-publish review for next week — catch OT and rest-gap violations before they hit payroll.",
      ctaLabel: "Check now",
      ctaHref: "/compliance",
    });
  }

  // ---------- Demand forecast (next 7 days) ----------
  // Use scheduled headcount as a baseline — Mon..Sun
  const demandByDay: { dayLabel: string; predicted: number; isHot?: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const next = addDays(day, 1);
    const count = weekShifts.filter(s => s.startsAt >= day && s.startsAt < next).length;
    const dow = day.getDay();
    const isHot = dow === 5 || dow === 6; // Fri/Sat default hot
    demandByDay.push({
      dayLabel: day.toLocaleDateString("en-US", { weekday: "short" }),
      predicted: count,
      isHot,
    });
  }

  // ---------- Week stats ----------
  const weekHours = weekShifts.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600_000, 0);
  const weekCost = weekShifts.reduce((a, s) => a + ((+s.endsAt - +s.startsAt) / 3600_000) * (members.find(m => m.id === s.memberId)?.hourlyRate ?? 0), 0);
  const weekOt = Math.max(0, weekHours - members.length * 40);

  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  // Day-1 mode: workspace has essentially nothing in it yet. Show a quiet,
  // focused "get started" view instead of the firehose dashboard so new managers
  // aren't drowned in 9 widgets that all say "—" or "no data". The full
  // dashboard takes over the moment any meaningful data exists. Employees
  // skip this — they don't set up the workspace.
  const hasLocation = locations.length > 0;
  const hasTeam     = members.length > 1; // owner + at least one other
  const hasShift    = weekShifts.length > 0 || todayShifts.length > 0;
  const showQuietDayOne = isManager && (!hasLocation || !hasTeam || !hasShift);

  if (showQuietDayOne) {
    return (
      <div className="space-y-6">
        <QuietDayOne
          name={u.name}
          hasLocation={hasLocation}
          hasTeam={hasTeam}
          hasShift={hasShift}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onboarding checklist — auto-hides once the workspace is set up. */}
      {isManager && <GettingStarted orgId={orgId} role={u.role} />}

      <HomeShell
        greeting={greeting}
        name={u.name}
        kpis={{
          labor: fmtMoney(laborToday),
          openShifts,
          clockedIn: clockedInNow,
          compliancePct,
        }}
        roster={roster}
        activity={activity}
        suggestions={suggestions}
        demand={demandByDay}
        weekStats={{
          hours: weekHours,
          shifts: weekShifts.length,
          cost: fmtMoney(weekCost),
          ot: weekOt,
        }}
      />

      {/* Vertical-specific widgets row */}
      {u.memberId && (
        <VerticalWidgets organizationId={u.organizationId} memberId={u.memberId} industry={u.organizationIndustry} />
      )}

      {/* Live locations map — sites, geofences, and today's punches (in/out). */}
      {isManager && (
        <LocationsPunchMap orgId={u.organizationId} sinceHours={24} subtitle="Your locations, clock-in zones, and today's punches" />
      )}

      {/* Nudge for invited teammates who haven't gone through /welcome yet. */}
      {isManager && <PendingOnboardingWidget orgId={u.organizationId} />}

      {/* Manager-only HR widgets */}
      {isManager && <TurnoverWidget organizationId={u.organizationId} />}

      {isManager && ["security", "healthcare", "field_service", "construction"].includes(u.organizationIndustry ?? "") && (
        <PermitExpiryWidget organizationId={u.organizationId} />
      )}
    </div>
  );
}
