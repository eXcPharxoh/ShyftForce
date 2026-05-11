import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { IncidentStatusForm } from "@/components/incidents/status-form";
import { ShieldAlert, MapPin, User, Calendar, FileText, AlertTriangle } from "lucide-react";
import { dateLabel, timeLabel, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SEVERITY_COLORS: Record<string, string> = {
  low: "badge-gray",
  medium: "badge-amber",
  high: "badge bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200",
  critical: "badge-red",
};

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const i = await prisma.incidentReport.findFirst({
    where: { id, organizationId: u.organizationId, ...(isManager ? {} : { reportedById: u.memberId }) },
    include: {
      location: true,
      shift: { include: { location: true } },
      reportedBy: { include: { user: { select: { name: true, avatar: true } } } },
      reviewedBy: { include: { user: { select: { name: true } } } },
    },
  });
  if (!i) redirect("/incidents");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Incident #{i.id.slice(0, 8)}"
        icon={ShieldAlert}
        title={i.title}
        subtitle={`${dateLabel(i.occurredAt)} ${timeLabel(i.occurredAt)} · ${i.category.replace(/_/g, " ")}`}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <span className={SEVERITY_COLORS[i.severity]}>{i.severity}</span>
        <span className="badge-gray uppercase text-[10px]">{i.status}</span>
        {i.location && <span className="badge-gray flex items-center gap-1"><MapPin className="w-3 h-3" /> {i.location.name}</span>}
        <span className="badge-gray flex items-center gap-1"><User className="w-3 h-3" /> {i.reportedBy.user.name}</span>
        {i.policeReportNo && <span className="badge-orange">Police #{i.policeReportNo}</span>}
      </div>

      <section className="card p-5">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-ink-500" /> Description</h3>
        <p className="text-sm text-ink-800 dark:text-ink-200 whitespace-pre-wrap leading-relaxed">{i.body}</p>

        {i.witnessNames && (
          <div className="mt-4">
            <div className="text-[11px] uppercase text-ink-500 font-semibold tracking-wider mb-1">Witnesses</div>
            <div className="text-sm">{i.witnessNames}</div>
          </div>
        )}

        {i.photoData && (
          <div className="mt-4">
            <div className="text-[11px] uppercase text-ink-500 font-semibold tracking-wider mb-1">Photo</div>
            <img src={i.photoData} className="rounded-lg max-w-md border border-ink-200 dark:border-ink-700" alt="Incident" />
          </div>
        )}
      </section>

      {i.resolutionNotes && (
        <section className="card p-5 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/10">
          <h3 className="text-sm font-bold mb-2 text-emerald-800 dark:text-emerald-200">Resolution</h3>
          <p className="text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap">{i.resolutionNotes}</p>
          {i.reviewedBy && i.reviewedAt && (
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-2">
              by {i.reviewedBy.user.name} · {new Date(i.reviewedAt).toLocaleString()}
            </div>
          )}
        </section>
      )}

      {isManager && (
        <section className="card p-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" /> Manager controls</h3>
          <IncidentStatusForm
            incidentId={i.id}
            initialStatus={i.status as any}
            initialSeverity={i.severity as any}
            initialResolutionNotes={i.resolutionNotes ?? ""}
          />
        </section>
      )}
    </div>
  );
}
