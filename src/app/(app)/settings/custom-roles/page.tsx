import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PERMISSION_CATALOG } from "@/lib/permissions";
import { ShieldHalf, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomRolesPage() {
  const u = await requireManagerOrAdmin();
  const roles = await prisma.customRole.findMany({
    where: { organizationId: u.organizationId },
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Access control"
        icon={ShieldHalf}
        title="Roles & permissions"
        subtitle={`${roles.length} custom role${roles.length === 1 ? "" : "s"} · the three built-in roles (Admin / Manager / Employee) always apply on top.`}
      />

      {/* Built-in roles primer */}
      <section className="card p-5 bg-ink-50/40 dark:bg-ink-900/40">
        <h3 className="text-sm font-semibold mb-2">Built-in roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-3">
            <span className="badge-orange">Admin</span>
            <p className="text-ink-500 dark:text-ink-400 mt-2">Full org access. Billing, integrations, member roles, everything.</p>
          </div>
          <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-3">
            <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">Manager</span>
            <p className="text-ink-500 dark:text-ink-400 mt-2">Schedule, approve, run payroll, view reports + audit. No billing or member roles.</p>
          </div>
          <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-3">
            <span className="badge-gray">Employee</span>
            <p className="text-ink-500 dark:text-ink-400 mt-2">Read-only on schedule + teammates. Submit time-off, expenses, clock in.</p>
          </div>
        </div>
      </section>

      {roles.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShieldHalf}
            tone="brand"
            title="No custom roles yet"
            description='Create roles like "Site Lead" (manage one location), "Auditor" (read-only access to audit + reports), or "Payroll Admin" (timesheets + payroll only). Custom roles ADD permissions on top of the built-in role.'
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {roles.map(r => {
            let perms: string[] = [];
            try { perms = JSON.parse(r.permissions); } catch {}
            return (
              <li key={r.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                    <ShieldHalf className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{r.name}</div>
                    {r.description && <p className="text-[11px] text-ink-500 mt-0.5">{r.description}</p>}
                    <div className="text-[11px] text-ink-500 mt-1 flex items-center gap-2">
                      <Users className="w-3 h-3" /> {r._count.members} member{r._count.members === 1 ? "" : "s"}
                      <span className="text-ink-300">·</span>
                      {perms.length} permission{perms.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Permission catalog for reference */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Permission catalog</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
          {PERMISSION_CATALOG.map(p => (
            <div key={p.key} className="rounded-lg border border-ink-200 dark:border-ink-800 px-2.5 py-1.5">
              <code className="text-[10px] font-mono text-ink-500">{p.key}</code>
              <div className="text-ink-700 dark:text-ink-300">{p.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
