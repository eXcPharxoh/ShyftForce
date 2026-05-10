import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, fmtHours, fmtMoney, initials, relTime, startOfWeek, timeLabel } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  User as UserIcon, MapPin, Mail, Phone, Calendar, Cake, Shield, FileText,
  MessageSquareHeart, Clock, AlertTriangle, CheckCircle2, BadgeCheck, Briefcase, Award,
} from "lucide-react";
import { ChevronLeft } from "lucide-react";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;

  const member = await prisma.member.findFirst({
    where: { id, organizationId: u.organizationId },
    include: {
      user: true,
      location: true,
      certifications: { orderBy: { expiresOn: "asc" } },
      shifts: {
        where: { startsAt: { gte: addDays(new Date(), -90), lt: addDays(new Date(), 30) } },
        include: { location: true },
        orderBy: { startsAt: "desc" }, take: 30,
      },
      timeOffRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      expenseRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      attendanceLogs: { orderBy: { at: "desc" }, take: 12 },
      kudosReceived: { include: { from: { include: { user: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!member) notFound();

  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  // Pay period stats
  const period = await prisma.payPeriod.findFirst({
    where: { organizationId: u.organizationId, status: "open" },
    include: { entries: { where: { memberId: id } } },
  });
  const periodHours = (period?.entries ?? []).reduce((a, e) => a + e.hours, 0);
  const periodCost  = (period?.entries ?? []).reduce((a, e) => a + e.hours * (member.hourlyRate ?? 0), 0);

  // This week's stats
  const weekStart = startOfWeek(new Date());
  const weekShifts = member.shifts.filter(s => s.startsAt >= weekStart && s.startsAt < addDays(weekStart, 7));
  const weekHours  = weekShifts.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600000, 0);

  // Certifications status
  const now = new Date();
  const expiringSoon = member.certifications.filter(c => c.expiresOn && c.expiresOn > now && (+c.expiresOn - +now) < 60 * 86400 * 1000);
  const expired      = member.certifications.filter(c => c.expiresOn && c.expiresOn <= now);

  return (
    <div className="space-y-6 max-w-6xl">
      <Link href="/hr/members" className="inline-flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-50 -mb-2">
        <ChevronLeft className="w-3.5 h-3.5" /> All members
      </Link>

      {/* Hero */}
      <div className="card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-30 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row gap-6 items-start">
          {member.user.avatar
            ? <img src={member.user.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white dark:ring-ink-800 shadow-soft" />
            : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-rose-500 text-white text-2xl font-bold flex items-center justify-center shadow-soft">{initials(member.user.name)}</div>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight-2">{member.user.name}</h1>
              {member.role === "ADMIN" && <span className="badge-orange">Admin</span>}
              {member.role === "MANAGER" && <span className="badge-blue">Manager</span>}
              {member.role === "EMPLOYEE" && <span className="badge-gray">Employee</span>}
              {member.status !== "active" && <span className="badge-red">Inactive</span>}
            </div>
            <div className="text-ink-600 dark:text-ink-400 mt-1">{member.position ?? "No position"} · {member.location?.name ?? "No location"}</div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Chip icon={Mail} label={member.user.email} href={`mailto:${member.user.email}`} />
              {member.phone && <Chip icon={Phone} label={member.phone} href={`tel:${member.phone}`} />}
              <Chip icon={Calendar} label={`Hired ${dateLabel(member.hireDate)}`} />
              {member.birthday && <Chip icon={Cake} label={member.birthday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} />}
              {member.hourlyRate != null && <Chip icon={Briefcase} label={`${fmtMoney(member.hourlyRate)}/h`} />}
            </div>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Hours this week"  value={fmtHours(weekHours)} />
        <Stat label="Hours this period" value={fmtHours(periodHours)} />
        <Stat label="Estimated pay (period)" value={fmtMoney(periodCost)} />
        <Stat label="Kudos received" value={member.kudosReceived.length} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — schedule + attendance */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recent shifts */}
          <section className="card p-5">
            <header className="flex items-center justify-between mb-4">
              <h3 className="h-section flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Recent shifts</h3>
              <Link href={`/schedule`} className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline">Open Schedule →</Link>
            </header>
            {member.shifts.length === 0 ? (
              <EmptyState icon={Calendar} title="No recent shifts" description="Past 90 days." />
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {member.shifts.slice(0, 8).map(s => (
                  <li key={s.id} className="py-2.5 flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-brand-300 dark:bg-brand-500/50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">{s.position ?? "Shift"} · {s.location.name}</div>
                      <div className="text-[11px] text-ink-500 dark:text-ink-400">{dateLabel(s.startsAt)} · {timeLabel(s.startsAt)} – {timeLabel(s.endsAt)}</div>
                    </div>
                    <span className={s.status === "draft" ? "badge-amber" : "badge-green"}>{s.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent attendance */}
          <section className="card p-5">
            <h3 className="h-section flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Recent clock events</h3>
            {member.attendanceLogs.length === 0 ? (
              <EmptyState icon={Clock} title="No clock events yet" />
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {member.attendanceLogs.map(l => (
                  <li key={l.id} className="py-2.5 flex items-center gap-3">
                    <span className={
                      "w-2 h-2 rounded-full shrink-0 " +
                      (l.type === "clock_in" ? "bg-emerald-500" :
                       l.type === "clock_out" ? "bg-rose-500" :
                       l.type === "break_start" ? "bg-amber-500" : "bg-sky-500")
                    } />
                    <div className="flex-1 min-w-0 text-sm">
                      <span className="font-medium text-ink-900 dark:text-ink-100">{labelForType(l.type)}</span>
                      {l.distanceMeters != null && (
                        <span className="text-[11px] text-ink-500 dark:text-ink-400 ml-2">
                          {l.withinGeofence ? "✓ in geofence" : "⚠ outside"} · {Math.round(l.distanceMeters)}m
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-ink-500 dark:text-ink-400">{relTime(l.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent kudos */}
          <section className="card p-5">
            <h3 className="h-section flex items-center gap-2 mb-4"><MessageSquareHeart className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Recognition</h3>
            {member.kudosReceived.length === 0 ? (
              <EmptyState icon={MessageSquareHeart} title="No kudos yet" tone="brand" description="Send the first one from the High Fives page." action={<Link href="/hr/kudos" className="btn-soft text-xs">Send a high five</Link>} />
            ) : (
              <ul className="space-y-3">
                {member.kudosReceived.map(k => (
                  <li key={k.id} className="flex items-start gap-3 p-3 rounded-xl bg-ink-50/60 dark:bg-ink-800/40">
                    <span className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-base shrink-0">{k.emoji ?? "🙌"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ink-500 dark:text-ink-400">From {k.from.user.name} · {relTime(k.createdAt)}</div>
                      <div className="text-sm text-ink-800 dark:text-ink-200 mt-0.5">"{k.message}"</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column — certs, time off, expenses, manager-only fields */}
        <div className="space-y-4">
          {/* Certifications */}
          <section className="card p-5">
            <header className="flex items-center justify-between mb-3">
              <h3 className="h-section flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Certifications</h3>
              {(expiringSoon.length > 0 || expired.length > 0) && (
                <span className="badge-amber">{expiringSoon.length + expired.length} attention</span>
              )}
            </header>
            {member.certifications.length === 0 ? (
              <EmptyState icon={Award} title="No certifications" description="Track licenses, training, and required certifications here." />
            ) : (
              <ul className="space-y-2">
                {member.certifications.map(c => {
                  const isExpired = c.expiresOn && c.expiresOn <= now;
                  const isExpiring = c.expiresOn && !isExpired && (+c.expiresOn - +now) < 60 * 86400 * 1000;
                  return (
                    <li key={c.id} className={`p-2.5 rounded-xl border ${isExpired ? "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10" : isExpiring ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10" : "border-ink-200 dark:border-ink-800"}`}>
                      <div className="flex items-center gap-2">
                        <Award className={`w-4 h-4 shrink-0 ${isExpired ? "text-rose-600 dark:text-rose-400" : isExpiring ? "text-amber-600 dark:text-amber-400" : "text-ink-500 dark:text-ink-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink-900 dark:text-ink-100 truncate">{c.name}</div>
                          {c.expiresOn && (
                            <div className={`text-[11px] ${isExpired ? "text-rose-700 dark:text-rose-300" : isExpiring ? "text-amber-700 dark:text-amber-300" : "text-ink-500 dark:text-ink-400"}`}>
                              {isExpired ? "Expired " : "Expires "}{dateLabel(c.expiresOn)}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Time off */}
          <section className="card p-5">
            <h3 className="h-section flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Time off</h3>
            {member.timeOffRequests.length === 0 ? (
              <EmptyState icon={Calendar} title="No requests" />
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {member.timeOffRequests.slice(0, 5).map(r => (
                  <li key={r.id} className="py-2 text-sm flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink-900 dark:text-ink-100">{dateLabel(r.startsOn)} → {dateLabel(r.endsOn)}</div>
                      <div className="text-[11px] text-ink-500 dark:text-ink-400">{r.category}{r.reason ? ` · ${r.reason}` : ""}</div>
                    </div>
                    <span className={r.status === "approved" ? "badge-green" : r.status === "rejected" ? "badge-red" : "badge-amber"}>{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Manager-only sensitive info */}
          {isManager && (
            <section className="card p-5 border-amber-200 dark:border-amber-500/20">
              <h3 className="h-section flex items-center gap-2 mb-3"><Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Manager view</h3>
              <dl className="space-y-2.5 text-sm">
                <DRow label="Emergency contact" value={member.emergencyContactName ? `${member.emergencyContactName}${member.emergencyContactPhone ? ` · ${member.emergencyContactPhone}` : ""}` : null} />
                <DRow label="Hire date" value={dateLabel(member.hireDate)} />
                <DRow label="Hourly rate" value={member.hourlyRate != null ? `${fmtMoney(member.hourlyRate)}/h` : null} />
                <DRow label="Payroll provider" value={member.payrollProvider} />
                <DRow label="External employee ID" value={member.externalEmployeeId} />
                {member.notes && (
                  <div className="pt-2 mt-2 border-t border-ink-100 dark:border-ink-800">
                    <div className="text-[11px] uppercase font-semibold tracking-wider text-ink-500 dark:text-ink-400 mb-1">Notes</div>
                    <div className="text-sm text-ink-700 dark:text-ink-300 whitespace-pre-wrap">{member.notes}</div>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ icon: Icon, label, href }: { icon: any; label: string; href?: string }) {
  const inner = <><Icon className="w-3.5 h-3.5 text-ink-500 dark:text-ink-400" /> <span>{label}</span></>;
  const cls = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ink-100/70 dark:bg-ink-800/60 text-ink-700 dark:text-ink-300 hover:bg-ink-200/70 dark:hover:bg-ink-800 transition";
  return href ? <a href={href} className={cls}>{inner}</a> : <span className={cls}>{inner}</span>;
}

function Stat({ label, value, tone = "ink" }: { label: string; value: string | number; tone?: "ink" | "emerald" | "amber" }) {
  const toneCls = tone === "emerald" ? "text-emerald-700 dark:text-emerald-300" : tone === "amber" ? "text-amber-700 dark:text-amber-300" : "text-ink-900 dark:text-ink-50";
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase font-semibold tracking-wider text-ink-500 dark:text-ink-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 tracking-tight-2 ${toneCls}`}>{value}</div>
    </div>
  );
}

function DRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] uppercase font-semibold tracking-wider text-ink-500 dark:text-ink-400">{label}</dt>
      <dd className="text-sm text-ink-900 dark:text-ink-100 truncate text-right">{value ?? <span className="text-ink-400 dark:text-ink-600 italic">not set</span>}</dd>
    </div>
  );
}

function labelForType(t: string): string {
  switch (t) {
    case "clock_in":    return "Clocked in";
    case "clock_out":   return "Clocked out";
    case "break_start": return "Started break";
    case "break_end":   return "Ended break";
    default:            return t;
  }
}
