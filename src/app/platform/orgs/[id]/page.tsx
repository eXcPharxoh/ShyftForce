import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { dateLabel, relTime } from "@/lib/utils";
import { ImpersonateButton } from "@/components/platform/impersonate-button";
import { OrgSettingsForm } from "@/components/platform/org-settings-form";
import { UserActionsMenu } from "@/components/platform/user-actions-menu";
import { Building2, ArrowLeft, Users, MapPin, Calendar, FileText, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      locations: true,
      members: { include: { user: true, location: true }, orderBy: [{ role: "asc" }, { user: { name: "asc" } }] },
    },
  });
  if (!org) return notFound();

  const [shiftCount, openShiftCount, openIncidents, recentAudit] = await Promise.all([
    prisma.shift.count({ where: { location: { organizationId: id } } }),
    prisma.shift.count({ where: { location: { organizationId: id }, isOpen: true, startsAt: { gt: new Date() } } }),
    prisma.incidentReport.count({ where: { organizationId: id, status: { in: ["open", "investigating"] } } }).catch(() => 0),
    prisma.auditLog.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { email: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/platform/orgs" className="btn-ghost text-xs"><ArrowLeft className="w-3.5 h-3.5" /> All organizations</Link>
      </div>
      <header className="card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-2xl">{(org.name[0] ?? "?").toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
          <div className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">
            <span className="font-mono">{org.slug}</span> · {org.industry ?? "no industry"} · created {dateLabel(org.createdAt)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <span className="badge bg-brand-50 text-brand-700">plan: {org.plan}</span>
            {org.subscriptionStatus && <span className={`badge ${org.subscriptionStatus === "past_due" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{org.subscriptionStatus}</span>}
            {org.trialEndsAt && <span className="badge-gray">trial ends {dateLabel(org.trialEndsAt)}</span>}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Users className="w-4 h-4" />} label="Members" value={org.members.length} />
        <Stat icon={<MapPin className="w-4 h-4" />} label="Locations" value={org.locations.length} />
        <Stat icon={<Calendar className="w-4 h-4" />} label="Shifts" value={shiftCount} sub={`${openShiftCount} open`} />
        <Stat icon={<FileText className="w-4 h-4" />} label="Open incidents" value={openIncidents} />
      </div>

      <OrgSettingsForm
        org={{
          id: org.id,
          name: org.name,
          slug: org.slug,
          industry: org.industry,
          plan: org.plan,
          subscriptionStatus: org.subscriptionStatus,
          trialEndsAt: org.trialEndsAt ? org.trialEndsAt.toISOString() : null,
          isDemo: org.isDemo,
          timezone: org.timezone,
        }}
      />

      {org.locations.length > 0 && (
        <section className="card overflow-hidden">
          <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-ink-500" />
            <h3 className="text-sm font-semibold">Locations</h3>
            <span className="text-[11px] text-ink-500">{org.locations.length} total</span>
          </header>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {org.locations.map((l) => (
              <li key={l.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                <MapPin className="w-3.5 h-3.5 text-ink-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-[11px] text-ink-500">
                    {l.latitude != null && l.longitude != null ? `📍 ${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}` : "No GPS set"} · geofence {l.geofenceRadiusMeters}m
                  </div>
                </div>
                {l.weeklyBudget != null && <span className="text-[11px] text-ink-500 font-mono">${l.weeklyBudget.toLocaleString()}/wk</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-ink-500" />
          <h3 className="text-sm font-semibold">Members</h3>
          <span className="text-[11px] text-ink-500">{org.members.length} total</span>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-ink-50/60 dark:bg-ink-900 text-[11px] uppercase font-bold tracking-wider text-ink-500">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Location</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {org.members.map((m) => (
              <tr key={m.id} className="border-t border-ink-100 dark:border-ink-800">
                <td className="px-4 py-2 font-medium">{m.user.name}</td>
                <td className="px-4 py-2 text-ink-700 dark:text-ink-300">{m.user.email}</td>
                <td className="px-4 py-2">
                  {m.role === "ADMIN" && <span className="badge-orange">Admin</span>}
                  {m.role === "MANAGER" && <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">Manager</span>}
                  {m.role === "EMPLOYEE" && <span className="badge-gray">Employee</span>}
                </td>
                <td className="px-4 py-2">
                  {m.status === "active"
                    ? <span className="badge-green">active</span>
                    : <span className="badge-gray">{m.status}</span>}
                </td>
                <td className="px-4 py-2 text-[11px] text-ink-500">{m.location?.name ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <ImpersonateButton userId={m.userId} email={m.user.email} name={m.user.name} />
                    <UserActionsMenu
                      userId={m.userId}
                      email={m.user.email}
                      name={m.user.name}
                      locked={false}
                      verified={true}
                      role={m.role as any}
                      status={m.status as any}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-ink-500" />
          <h3 className="text-sm font-semibold">Recent audit log</h3>
        </header>
        <ul className="divide-y divide-ink-100 dark:divide-ink-800 text-xs">
          {recentAudit.map((a) => (
            <li key={a.id} className="px-5 py-2 flex items-center gap-3">
              <span className="badge-gray font-mono">{a.action}</span>
              <span className="flex-1 truncate text-ink-700 dark:text-ink-300">
                {a.actor?.name ?? a.actor?.email ?? "system"} · {a.entityType ?? "—"} {a.entityId ? <span className="text-ink-400 font-mono">{a.entityId.slice(0, 8)}</span> : null}
              </span>
              <span className="text-[11px] text-ink-500">{relTime(a.createdAt)}</span>
            </li>
          ))}
          {recentAudit.length === 0 && <li className="px-5 py-6 text-center text-ink-500">No audit events yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider">{label}</div>
        <div className="text-xl font-bold">{value}</div>
        {sub && <div className="text-[10px] text-ink-500">{sub}</div>}
      </div>
    </div>
  );
}
