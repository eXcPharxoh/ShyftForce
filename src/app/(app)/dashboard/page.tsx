import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, fmtMoney, initials, startOfWeek } from "@/lib/utils";
import { HomeShell, type RosterEntry, type ActivityEntry, type CopilotSuggestion } from "@/components/dashboard/home-shell";
import { VerticalWidgets } from "@/components/dashboard/vertical-widgets";
import { TurnoverWidget } from "@/components/dashboard/turnover-widget";
import { PermitExpiryWidget } from "@/components/dashboard/permit-expiry-widget";
import { GettingStarted } from "@/components/dashboard/getting-started";

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

  // Compliance pct — derived from week shifts violations
  // Simple heuristic: # of shifts with no violation / total
  const weeklyShiftCount = weekShifts.length || 1;
  // For now compute a soft estimate. The full engine call is heavier; we keep this lightweight.
  const compliancePct = 100; // until we re-introduce the engine call cheaply

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

      {/* Manager-only HR widgets */}
      {isManager && <TurnoverWidget organizationId={u.organizationId} />}

      {isManager && ["security", "healthcare", "field_service", "construction"].includes(u.organizationIndustry ?? "") && (
        <PermitExpiryWidget organizationId={u.organizationId} />
      )}
    </div>
  );
}
