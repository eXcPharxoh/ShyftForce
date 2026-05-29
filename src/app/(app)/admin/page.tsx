import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { addDays, fmtMoney, relTime, startOfWeek } from "@/lib/utils";
import {
  effectivePlanKey, calculateMonthlyCost, orgHasFeature, FEATURE_CATALOG, PLANS,
} from "@/lib/stripe";
import {
  Shield, Users, MapPin, CalendarDays, CreditCard, UserCog, Lock, FileText,
  Plug, Bell, Plane, CalendarX, Briefcase, Check, X, ArrowRight, Crown, AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminConsolePage() {
  const u = await requireUser();
  // Owner console — ADMIN role only. Managers run day-to-day from /dashboard.
  if (u.role !== "ADMIN") redirect("/dashboard");

  const orgId = u.organizationId;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);

  const [org, roleCounts, activeMembers, locationCount, weekShifts, pendingInvites, recentAudit] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true, plan: true, trialEndsAt: true, subscriptionStatus: true,
        createdAt: true, suspendedAt: true, featureOverrides: true,
        stripeCustomerId: true, industry: true,
      },
    }),
    prisma.member.groupBy({
      by: ["role"],
      where: { organizationId: orgId, status: "active" },
      _count: { _all: true },
    }),
    prisma.member.count({ where: { organizationId: orgId, status: "active" } }),
    prisma.location.count({ where: { organizationId: orgId } }),
    prisma.shift.count({ where: { location: { organizationId: orgId }, startsAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.invitation.count({ where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: now } } }),
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  if (!org) redirect("/dashboard");

  const planKey = effectivePlanKey(org);
  const plan = PLANS[planKey];
  const cost = calculateMonthlyCost(planKey, activeMembers);
  const onTrial = !!org.trialEndsAt && org.trialEndsAt > now;
  const trialDaysLeft = onTrial ? Math.max(0, Math.ceil((+org.trialEndsAt! - +now) / 86400000)) : 0;

  const roleMap: Record<string, number> = {};
  for (const r of roleCounts) roleMap[r.role] = r._count._all;
  const admins = roleMap["ADMIN"] ?? 0;
  const managers = roleMap["MANAGER"] ?? 0;
  const employees = roleMap["EMPLOYEE"] ?? 0;

  const enabledFeatures = FEATURE_CATALOG.filter((f) => orgHasFeature(org, f.key));

  const quickLinks = [
    { href: "/settings/billing",      icon: CreditCard, label: "Billing & plan",      desc: "Subscription, invoices, seats" },
    { href: "/hr/members",            icon: Users,      label: "Members",             desc: "People, status, profiles" },
    { href: "/settings/custom-roles", icon: UserCog,    label: "Roles & permissions", desc: "Who can do what" },
    { href: "/settings/locations",    icon: MapPin,     label: "Locations",           desc: "Sites, geofences, budgets" },
    { href: "/settings/security",     icon: Lock,       label: "Security & 2FA",      desc: "Org-wide auth policy" },
    { href: "/settings/audit",        icon: FileText,   label: "Audit log",           desc: "Every action, logged" },
    { href: "/settings/integrations", icon: Plug,       label: "Integrations",        desc: "POS, payroll, Slack" },
    { href: "/settings/notifications",icon: Bell,       label: "Notifications",       desc: "Channels & language" },
    { href: "/settings/pto",          icon: Plane,      label: "Time-off policies",   desc: "Accrual & categories" },
    { href: "/settings/time-off-blackouts", icon: CalendarX, label: "Blackout windows", desc: "Block PTO in peak periods" },
    { href: "/hr/jobs",               icon: Briefcase,  label: "Hiring",              desc: "Postings & applicants" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Owner console"
        icon={Shield}
        title="Workspace"
        subtitle={`Everything you need to run ${org.name} — billing, people, roles, and workspace settings in one place.`}
      />

      {org.suspendedAt && org.suspendedAt < now && (
        <div className="card p-4 border-rose-500/30 bg-rose-500/10 flex items-center gap-3 text-sm text-rose-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>This workspace is currently suspended. Contact support@shyftforce.com.</span>
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Users className="w-5 h-5" />} label="Active members" value={activeMembers} sub={pendingInvites > 0 ? `${pendingInvites} pending invite${pendingInvites === 1 ? "" : "s"}` : "no pending invites"} />
        <Stat icon={<MapPin className="w-5 h-5" />} label="Locations" value={locationCount} />
        <Stat icon={<CalendarDays className="w-5 h-5" />} label="Shifts this week" value={weekShifts} />
        <Stat icon={<CreditCard className="w-5 h-5" />} label="Est. monthly cost" value={fmtMoney(cost.totalUSD)} sub={`${plan.label} · ${activeMembers} seats`} />
      </div>

      {/* Plan & billing + Team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold">Plan &amp; billing</h3>
            </div>
            <Link href="/settings/billing" className="text-[12px] text-brand-300 inline-flex items-center gap-1">Manage <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-display text-[34px] font-medium leading-none grad-text-accent">{plan.label}</span>
            {onTrial && <span className="status status-info mb-1">Trial · {trialDaysLeft}d left</span>}
            {org.subscriptionStatus === "active" && <span className="status status-success mb-1">Subscribed</span>}
            {org.subscriptionStatus === "past_due" && <span className="status status-danger mb-1">Past due</span>}
          </div>
          <div className="text-[12px] text-ink-500 mt-2 font-mono">
            ${plan.basePriceUSD} base + {plan.includedSeats} seats · ${plan.perSeatUSD}/extra seat ·
            {" "}{cost.overageSeats} over → {fmtMoney(cost.totalUSD)}/mo
          </div>
          {onTrial && (
            <div className="mt-3 rounded-md bg-brand-500/8 border border-brand-500/20 p-3 text-[12.5px] text-brand-200">
              You're on a free trial with full Business-tier access. Add a card before it ends to keep your team running.
            </div>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold">Team &amp; roles</h3>
            </div>
            <Link href="/hr/members" className="text-[12px] text-brand-300 inline-flex items-center gap-1">Manage <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <RoleStat label="Admins" value={admins} />
            <RoleStat label="Managers" value={managers} />
            <RoleStat label="Employees" value={employees} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[12.5px]">
            <span className="text-ink-400">Pending invitations</span>
            <span className="font-semibold text-ink-100">{pendingInvites}</span>
          </div>
          <Link href="/settings/custom-roles" className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-brand-300">
            <UserCog className="w-3.5 h-3.5" /> Configure roles &amp; permissions
          </Link>
        </section>
      </div>

      {/* Plan features */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Features on your plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
          {FEATURE_CATALOG.map((f) => {
            const on = enabledFeatures.some((e) => e.key === f.key);
            return (
              <div key={f.key} className="flex items-center gap-2 text-[13px] py-0.5">
                {on
                  ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  : <X className="w-3.5 h-3.5 text-ink-600 shrink-0" />}
                <span className={on ? "text-ink-200" : "text-ink-500"}>{f.label}</span>
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-ink-500 mt-3">
          Need more? <Link href="/settings/billing" className="text-brand-300">Upgrade your plan →</Link>
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h3 className="text-[11px] uppercase tracking-wider font-bold text-ink-500 mb-2">Manage workspace</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickLinks.map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href} className="card card-hover p-4">
              <Icon className="w-5 h-5 text-brand-400 mb-2" />
              <div className="font-medium text-sm text-ink-50">{label}</div>
              <div className="text-[11px] text-ink-500 mt-0.5">{desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <Link href="/settings/audit" className="text-[12px] text-brand-300">Full audit log →</Link>
        </header>
        <ul className="divide-y divide-white/[0.06] text-xs">
          {recentAudit.map((a) => (
            <li key={a.id} className="px-5 py-2 flex items-center gap-3">
              <span className="status status-mute font-mono">{a.action}</span>
              <span className="flex-1 truncate text-ink-300">
                {a.actor?.name ?? a.actor?.email ?? "system"}
                {a.entityType ? ` · ${a.entityType}` : ""}
              </span>
              <span className="text-[11px] text-ink-500">{relTime(a.createdAt)}</span>
            </li>
          ))}
          {recentAudit.length === 0 && <li className="px-5 py-6 text-center text-ink-500">No activity yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider">{label}</div>
        <div className="text-xl font-bold tracking-tight-2 truncate">{value}</div>
        {sub && <div className="text-[10px] text-ink-500 truncate">{sub}</div>}
      </div>
    </div>
  );
}

function RoleStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
      <div className="text-lg font-bold text-ink-50">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
    </div>
  );
}
