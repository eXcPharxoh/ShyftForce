import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { FileIncidentButton } from "@/components/incidents/file-incident-button";
import { ShieldAlert, AlertOctagon, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { dateLabel, initials, timeLabel } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SEVERITY_COLORS: Record<string, string> = {
  low: "badge-gray",
  medium: "badge-amber",
  high: "badge bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200",
  critical: "badge-red",
};

const STATUS_ICONS: Record<string, [any, string]> = {
  open: [AlertOctagon, "text-rose-600"],
  reviewing: [Clock, "text-amber-600"],
  resolved: [CheckCircle2, "text-emerald-600"],
  escalated: [AlertTriangle, "text-rose-700"],
};

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const where: any = { organizationId: u.organizationId };
  if (!isManager) where.reportedById = u.memberId;
  if (sp.status) where.status = sp.status;

  const [incidents, locations] = await Promise.all([
    prisma.incidentReport.findMany({
      where,
      include: {
        location: true,
        reportedBy: { include: { user: { select: { name: true, avatar: true } } } },
      },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  const counts = await prisma.incidentReport.groupBy({
    by: ["status"],
    where: { organizationId: u.organizationId },
    _count: { _all: true },
  });
  const byStatus: Record<string, number> = {};
  for (const c of counts) byStatus[c.status] = c._count._all;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Safety + security"
        icon={ShieldAlert}
        title="Incident Reports"
        subtitle={isManager ? `${incidents.length} incident${incidents.length === 1 ? "" : "s"} · open ${byStatus.open ?? 0} · critical-severity workflow auto-DMs all managers` : "Your filed reports"}
      >
        <FileIncidentButton locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
      </PageHeader>

      {isManager && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Filter current={sp.status} value="" label="All" count={incidents.length} />
          <Filter current={sp.status} value="open" label="Open" count={byStatus.open ?? 0} tone="rose" />
          <Filter current={sp.status} value="reviewing" label="Reviewing" count={byStatus.reviewing ?? 0} tone="amber" />
          <Filter current={sp.status} value="resolved" label="Resolved" count={byStatus.resolved ?? 0} tone="emerald" />
        </div>
      )}

      <section className="card overflow-hidden">
        {incidents.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-500 dark:text-ink-400">
            No incidents {sp.status ? `with status "${sp.status}"` : "filed yet"}. {!sp.status && "When something happens, file a report and it's stored, audited, and routed to managers automatically."}
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {incidents.map((i) => {
              const [StatusIcon, statusCls] = STATUS_ICONS[i.status] ?? [Clock, "text-ink-500"];
              return (
                <li key={i.id}>
                  <Link href={`/incidents/${i.id}`} className="block px-5 py-3 hover:bg-ink-50/40 dark:hover:bg-ink-800/40 transition">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center shrink-0 ${statusCls}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{i.title}</span>
                          <span className={SEVERITY_COLORS[i.severity]}>{i.severity}</span>
                          <span className="badge-gray uppercase text-[10px]">{i.category.replace(/_/g, " ")}</span>
                          <span className="badge-gray uppercase text-[10px]">{i.status}</span>
                        </div>
                        <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">
                          {dateLabel(i.occurredAt)} {timeLabel(i.occurredAt)}
                          {i.location && ` · ${i.location.name}`}
                          {" · filed by "}{i.reportedBy.user.name}
                        </div>
                        <div className="text-xs text-ink-700 dark:text-ink-300 mt-1 line-clamp-2">{i.body}</div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Filter({ current, value, label, count, tone }: { current: string | undefined; value: string; label: string; count: number; tone?: "rose" | "amber" | "emerald" }) {
  const active = (current ?? "") === value;
  const colors: Record<string, string> = {
    rose: "text-rose-700 dark:text-rose-300",
    amber: "text-amber-700 dark:text-amber-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
  };
  return (
    <Link href={`/incidents${value ? `?status=${value}` : ""}`} className={`card p-3 transition ${active ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15" : "hover:border-ink-300"}`}>
      <div className="text-[11px] uppercase font-semibold text-ink-500 tracking-wider">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${tone ? colors[tone] : "text-ink-900 dark:text-ink-50"}`}>{count}</div>
    </Link>
  );
}
