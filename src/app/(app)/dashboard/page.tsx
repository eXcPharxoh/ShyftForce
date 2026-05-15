import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, fmtMoney, initials, relTime, startOfWeek, timeLabel } from "@/lib/utils";
import { WidgetCard } from "@/components/widgets/widget-card";
import { LiveClock } from "@/components/widgets/live-clock";
import { AttendanceTracker } from "@/components/widgets/attendance-tracker";
import { SurveyProgress } from "@/components/widgets/survey-progress";
import Link from "next/link";
import { AlertCircle, Cake, CheckCircle2, FileText, Gift, MessageCircle, Sparkles, Users, ShieldCheck, AlertOctagon, AlertTriangle } from "lucide-react";
import { checkCompliance } from "@/lib/compliance/engine";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";
import { DashboardHero } from "@/components/dashboard/hero";
import { VerticalWidgets } from "@/components/dashboard/vertical-widgets";
import { verticalFor } from "@/lib/verticals/config";

export default async function Dashboard() {
  const u = await requireUser();
  const orgId = u.organizationId;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);

  const [
    locations, members,
    payPeriod, openShifts, dayNotes, kudos, hrReminders, billboardUnreadCount,
    activeSurveys, totalMembers, unpublishedShifts, conflicts,
  ] = await Promise.all([
    prisma.location.findMany({ where: { organizationId: orgId } }),
    prisma.member.findMany({ where: { organizationId: orgId, status: "active" }, include: { user: true, location: true } }),
    prisma.payPeriod.findFirst({ where: { organizationId: orgId, status: "open" }, include: { entries: true } }),
    prisma.shift.findMany({ where: { isOpen: true, location: { organizationId: orgId }, startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 5, include: { location: true } }),
    prisma.dayNote.findMany({ where: { organizationId: orgId, date: { gte: weekStart, lt: weekEnd } }, orderBy: { date: "asc" }, take: 6, include: { author: { include: { user: true } } } }),
    // Scope kudos to this org via the recipient — never global findMany.
    prisma.kudos.findMany({
      where: { to: { organizationId: orgId } },
      orderBy: { createdAt: "desc" }, take: 4,
      include: { from: { include: { user: true } }, to: { include: { user: true } } },
    }),
    prisma.hRReminder.findMany({ where: { organizationId: orgId, done: false }, orderBy: { dueOn: "asc" }, take: 5 }),
    prisma.billboardPost.count({ where: { organizationId: orgId } }),
    prisma.survey.findMany({ where: { organizationId: orgId, status: "active" }, include: { responses: true } }),
    prisma.member.count({ where: { organizationId: orgId, status: "active" } }),
    prisma.shift.count({ where: { status: "draft", location: { organizationId: orgId }, startsAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.timeOffRequest.count({ where: { member: { organizationId: orgId }, status: "pending" } }),
  ]);

  const flagged = payPeriod?.entries.filter(e => e.flagged).length ?? 0;
  const unapproved = payPeriod?.entries.filter(e => !e.approved).length ?? 0;
  const daysRemaining = payPeriod ? Math.max(0, Math.ceil((+payPeriod.endsOn - +now) / 86400000)) : 0;

  // Per-location timesheet alerts
  const tsByLocation = locations.map(loc => {
    const memberIds = members.filter(m => m.locationId === loc.id).map(m => m.id);
    const alerts = (payPeriod?.entries ?? []).filter(e => memberIds.includes(e.memberId) && (e.flagged || !e.approved)).length;
    const manager = members.find(m => m.locationId === loc.id && m.role === "MANAGER");
    return { id: loc.id, name: loc.name, alerts, manager: manager?.user.name ?? "—", weeklyBudget: loc.weeklyBudget ?? 0, projected: loc.projectedRevenue ?? 0 };
  });

  // Live attendance stats
  const allLogs = await prisma.attendanceLog.findMany({
    where: { member: { organizationId: orgId } },
    orderBy: { at: "asc" },
  });
  const memberStatus = new Map<string, "in" | "break" | "out">();
  for (const l of allLogs) {
    if (l.type === "clock_in") memberStatus.set(l.memberId, "in");
    else if (l.type === "break_start") memberStatus.set(l.memberId, "break");
    else if (l.type === "break_end") memberStatus.set(l.memberId, "in");
    else if (l.type === "clock_out") memberStatus.set(l.memberId, "out");
  }
  const working = [...memberStatus.values()].filter(v => v === "in").length;
  const onBreak = [...memberStatus.values()].filter(v => v === "break").length;

  // Upcoming anniversaries / birthdays (next 14 days)
  const upcomingPeople = members
    .map(m => {
      const candidates: { type: "birthday" | "anniversary"; date: Date }[] = [];
      if (m.birthday) {
        const next = nextOccurrence(m.birthday); candidates.push({ type: "birthday", date: next });
      }
      const next = nextOccurrence(m.hireDate); candidates.push({ type: "anniversary", date: next });
      const closest = candidates.sort((a,b) => +a.date - +b.date)[0];
      const daysOut = Math.round((+closest.date - +now) / 86400000);
      const yearsAt = closest.type === "anniversary" ? new Date().getFullYear() - new Date(m.hireDate).getFullYear() : 0;
      return { m, type: closest.type, date: closest.date, daysOut, yearsAt };
    })
    .filter(x => x.daysOut >= 0 && x.daysOut <= 14)
    .sort((a,b) => a.daysOut - b.daysOut)
    .slice(0, 5);

  // Open shift requests count
  const openShiftRequestsPending = await prisma.openShiftRequest.count({ where: { status: "pending", shift: { location: { organizationId: orgId } } } });

  // Compliance snapshot
  const [complianceSettings, allWeekShifts] = await Promise.all([
    getOrCreateComplianceSettings(orgId),
    prisma.shift.findMany({
      where: { location: { organizationId: orgId }, startsAt: { gte: addDays(weekStart, -7), lt: addDays(weekEnd, 7) }, memberId: { not: null } },
    }),
  ]);
  const complianceViolations = checkCompliance({
    shifts: allWeekShifts.map(s => ({ id: s.id, memberId: s.memberId, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status })),
    members: members.map(m => ({ id: m.id, name: m.user.name })),
    settings: complianceSettings,
  });
  const complianceErrors   = complianceViolations.filter(v => v.severity === "error").length;
  const complianceWarnings = complianceViolations.filter(v => v.severity === "warning").length;

  return (
    <div className="space-y-6">
      <DashboardHero
        name={u.name}
        orgName={u.organizationName}
        locationCount={locations.length}
        memberCount={totalMembers}
      />

      <VerticalWidgets organizationId={u.organizationId} memberId={u.memberId} industry={u.organizationIndustry} />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select className="input h-9 w-44">
            <option>All Locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="input h-9 w-44">
            <option>All Positions</option>
            <option>Security Officer</option>
            <option>Site Manager</option>
            <option>Patrol</option>
            <option>Dispatcher</option>
          </select>
        </div>
        <Link href="/more" className="btn-ghost text-xs">Workspace settings →</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1 — Date / Time */}
        <WidgetCard title="Date / Time"><LiveClock /></WidgetCard>

        {/* 2 — Pay Period Summary */}
        <WidgetCard title="Pay Period Summary" action="Open" actionHref="/attendance">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Days left" value={daysRemaining} tone="ink" />
            <Stat label="Discrepancies" value={flagged} tone="rose" />
            <Stat label="Unapproved" value={unapproved} tone="amber" />
          </div>
          <div className="mt-3 text-[11px] text-ink-500">
            {payPeriod ? `${dateLabel(payPeriod.startsOn)} → ${dateLabel(payPeriod.endsOn)}` : "No active pay period"}
          </div>
        </WidgetCard>

        {/* 3 — Schedule Conflicts */}
        <WidgetCard title="Schedule Conflicts" action="View" actionHref="/schedule">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${conflicts > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{conflicts}</div>
              <div className="text-xs text-ink-500">Pending conflicts this week</div>
            </div>
          </div>
        </WidgetCard>

        {/* 3b — Compliance */}
        <WidgetCard title="Compliance" action="Review" actionHref="/compliance">
          {complianceViolations.length === 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-base font-semibold text-emerald-700">All clear</div>
                <div className="text-xs text-ink-500">No violations detected</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {complianceErrors > 0 && (
                  <span className="badge bg-rose-50 text-rose-700 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" /> {complianceErrors} error{complianceErrors === 1 ? "" : "s"}
                  </span>
                )}
                {complianceWarnings > 0 && (
                  <span className="badge bg-amber-50 text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {complianceWarnings} warning{complianceWarnings === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-600 line-clamp-2">{complianceViolations[0].message}</div>
            </div>
          )}
        </WidgetCard>

        {/* 4 — Upcoming Anniversaries */}
        <WidgetCard title="Upcoming Anniversaries" action="All" actionHref="/hr/members">
          <ul className="space-y-2">
            {upcomingPeople.length === 0 && <li className="text-xs text-ink-500">Nothing coming up.</li>}
            {upcomingPeople.map(({ m, type, date, daysOut, yearsAt }) => (
              <li key={m.id} className="flex items-center gap-2.5">
                <Avatar name={m.user.name} src={m.user.avatar ?? undefined} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.user.name}</div>
                  <div className="text-[11px] text-ink-500 truncate">
                    {type === "birthday" ? "🎂 Birthday" : `🎉 ${yearsAt}-yr anniversary`} · {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
                <span className="badge-gray">{daysOut === 0 ? "today" : `in ${daysOut}d`}</span>
              </li>
            ))}
          </ul>
        </WidgetCard>

        {/* 5 — My Space */}
        <WidgetCard title="My Space" action="Open" actionHref="/dashboard">
          <ul className="space-y-2 text-sm">
            <MyItem icon={<FileText className="w-4 h-4" />} label="Document requests" count={2} />
            <MyItem icon={<CheckCircle2 className="w-4 h-4" />} label="Upcoming shifts" count={3} />
            <MyItem icon={<Users className="w-4 h-4" />} label="Schedule requests" count={0} />
            <MyItem icon={<Gift className="w-4 h-4" />} label="Time-off requests" count={1} />
            <MyItem icon={<MessageCircle className="w-4 h-4" />} label="News feed" count={billboardUnreadCount > 7 ? 7 : billboardUnreadCount} />
          </ul>
        </WidgetCard>

        {/* 6 — Pending Requests (open shifts) */}
        <WidgetCard title="Pending Requests" action="See all" actionHref="/schedule">
          <div className="text-xs text-ink-500 mb-2">{openShifts.length} open shifts · {openShiftRequestsPending} self-assign requests</div>
          <ul className="space-y-2">
            {openShifts.slice(0, 4).map(s => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.position ?? "Open shift"}</div>
                  <div className="text-[11px] text-ink-500 truncate">{s.location.name} · {dateLabel(s.startsAt)} {timeLabel(s.startsAt)}</div>
                </div>
                <span className="badge-orange">Open</span>
              </li>
            ))}
            {openShifts.length === 0 && <li className="text-xs text-ink-500">No pending open shifts.</li>}
          </ul>
        </WidgetCard>

        {/* 7 — Day Notes */}
        <WidgetCard title="Day Notes" action="Add" actionHref="/schedule">
          <ul className="space-y-2">
            {dayNotes.length === 0 && <li className="text-xs text-ink-500">No notes this week.</li>}
            {dayNotes.map(n => (
              <li key={n.id} className="text-sm">
                <div className="text-[11px] text-ink-500">{dateLabel(n.date)} · {n.author.user.name}</div>
                <div className="line-clamp-2">{n.body}</div>
              </li>
            ))}
          </ul>
        </WidgetCard>

        {/* 8 — High Fives */}
        <WidgetCard title="High Fives" action="Send" actionHref="/hr/kudos" span={2}>
          <ul className="space-y-3">
            {kudos.map(k => (
              <li key={k.id} className="flex items-start gap-3">
                <Avatar name={k.from.user.name} src={k.from.user.avatar ?? undefined} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{k.from.user.name}</span>
                    <span className="text-ink-500"> high-fived </span>
                    <span className="font-medium">{k.to.user.name}</span>
                    <span className="ml-1">{k.emoji}</span>
                  </div>
                  <div className="text-sm text-ink-700 dark:text-ink-300 mt-0.5">"{k.message}"</div>
                  <div className="text-[11px] text-ink-500 mt-0.5">{relTime(k.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        </WidgetCard>

        {/* 9 — Attendance Tracker (LIVE) */}
        <WidgetCard title="Attendance Tracker" action="Live" actionHref="/attendance">
          <AttendanceTracker initial={{ working, onBreak, lateOrAbsent: 0 }} />
        </WidgetCard>

        {/* 10 — Unpublished Schedules */}
        <WidgetCard title="Unpublished Schedules" action="Publish" actionHref="/schedule">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${unpublishedShifts > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{unpublishedShifts}</div>
              <div className="text-xs text-ink-500">draft shifts this week</div>
            </div>
          </div>
        </WidgetCard>

        {/* 11 — Shift Tasks */}
        <WidgetCard title="Shift Tasks" action="Today" actionHref="/schedule">
          <ul className="space-y-1.5 text-sm">
            <Task done text="Patrol perimeter (every 2h)" />
            <Task done text="Check entry logs at 12:00" />
            <Task text="Submit incident report" />
            <Task text="Confirm overnight handoff" />
          </ul>
        </WidgetCard>

        {/* 12 — Employee Onboarding */}
        <WidgetCard title="Employee Onboarding" action="Configure" actionHref="/hr/members">
          <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">Customize your onboarding workflow — checklists, documents, training.</p>
          <Link href="/hr/members" className="btn-outline text-xs">Configure workflow</Link>
        </WidgetCard>

        {/* 13 — Timesheet Approval (per location) */}
        <WidgetCard title="Timesheet Approval" action="Open" actionHref="/attendance" span={2}>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-ink-500">
              <tr>
                <th className="text-left font-medium pb-2">Location</th>
                <th className="text-left font-medium pb-2">Manager</th>
                <th className="text-left font-medium pb-2">Alerts</th>
                <th className="text-right font-medium pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {tsByLocation.map(l => (
                <tr key={l.id} className="border-t border-ink-100 dark:border-ink-800">
                  <td className="py-2 font-medium">{l.name}</td>
                  <td className="py-2 text-ink-700 dark:text-ink-300">{l.manager}</td>
                  <td className="py-2"><span className={l.alerts > 0 ? "badge-rose badge bg-rose-50 text-rose-700" : "badge-green"}>{l.alerts} alerts</span></td>
                  <td className="py-2 text-right"><Link href="/attendance" className="btn-ghost text-xs">Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </WidgetCard>

        {/* 14 — Weekly Budget */}
        <WidgetCard title="Weekly Budget">
          <ul className="space-y-2.5">
            {tsByLocation.map(l => {
              const pct = l.weeklyBudget > 0 ? Math.min(120, (l.projected / l.weeklyBudget) * 100) : 0;
              const over = l.projected > l.weeklyBudget;
              return (
                <li key={l.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium truncate">{l.name}</span>
                    <span className={over ? "text-rose-600 font-semibold" : "text-emerald-700 font-semibold"}>
                      {fmtMoney(l.projected)} / {fmtMoney(l.weeklyBudget)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                    <div className={`h-full ${over ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </WidgetCard>

        {/* 15 — Surveys */}
        <WidgetCard title="Surveys" action="View" actionHref="/hr/surveys">
          {activeSurveys[0]
            ? <SurveyProgress responses={activeSurveys[0].responses.length} total={66} title={activeSurveys[0].title} />
            : <div className="text-xs text-ink-500">No active surveys.</div>}
        </WidgetCard>

        {/* 16 — HR Reminders */}
        <WidgetCard title="HR Reminders" action="See all" actionHref="/hr">
          <ul className="space-y-1.5">
            {hrReminders.map(r => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-ink-300 text-brand-500 focus:ring-brand-500" />
                <span className="flex-1 truncate">{r.title}</span>
                <span className="badge-gray">{dateLabel(r.dueOn)}</span>
              </li>
            ))}
          </ul>
        </WidgetCard>
      </div>

      <VerticalPromoCard industry={u.organizationIndustry} />
    </div>
  );
}

function VerticalPromoCard({ industry }: { industry: string | null }) {
  const v = verticalFor(industry);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-rose-500 text-white p-6 md:p-8">
      <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="badge bg-white/20 text-white ring-white/30 mb-2 flex items-center gap-1.5 w-fit">
            <span>{v.emoji}</span> {v.label}
          </div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight-2">{v.promoCard.emoji} {v.promoCard.title}</h3>
          <p className="text-sm text-white/80 mt-1.5">{v.promoCard.subtitle}</p>
        </div>
        <Link href={v.promoCard.href} className="bg-white text-brand-700 hover:bg-white/95 btn shadow-soft self-start md:self-auto">
          Open →
        </Link>
      </div>
    </div>
  );
}

function nextOccurrence(d: Date): Date {
  const today = new Date(); today.setHours(0,0,0,0);
  const cand = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (cand < today) cand.setFullYear(cand.getFullYear() + 1);
  return cand;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ink" | "rose" | "amber" | "emerald" }) {
  const colors: Record<string, string> = {
    ink:     "text-ink-900 dark:text-ink-50",
    rose:    "text-rose-600 dark:text-rose-400",
    amber:   "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div>
      <div className={`text-2xl font-bold ${colors[tone]}`}>{value}</div>
      <div className="text-[11px] text-ink-500 dark:text-ink-400 font-medium">{label}</div>
    </div>
  );
}

function MyItem({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-ink-50 text-ink-600 flex items-center justify-center">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className={count > 0 ? "badge-orange" : "badge-gray"}>{count}</span>
    </li>
  );
}

function Task({ text, done }: { text: string; done?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <input type="checkbox" defaultChecked={done} className="rounded border-ink-300 text-brand-500 focus:ring-brand-500" />
      <span className={done ? "text-ink-400 line-through" : ""}>{text}</span>
    </li>
  );
}

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) return <img src={src} alt={name} className="w-8 h-8 rounded-full" />;
  return <div className="w-8 h-8 rounded-full bg-ink-200 dark:bg-ink-800 text-ink-700 dark:text-ink-300 text-xs font-semibold flex items-center justify-center">{initials(name)}</div>;
}
