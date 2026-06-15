import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardCheck, CheckCircle2, Clock } from "lucide-react";
import { relTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const where: any = { cycle: { organizationId: u.organizationId } };
  if (!isManager) {
    where.OR = [
      { subjectMemberId: u.memberId, submittedAt: { not: null } },
      { reviewerMemberId: u.memberId },
    ];
  }

  const [reviews, cycles] = await Promise.all([
    prisma.performanceReview.findMany({
      where,
      include: {
        subjectMember:  { include: { user: { select: { name: true } } } },
        reviewerMember: { include: { user: { select: { name: true } } } },
        cycle: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    isManager ? prisma.reviewCycle.findMany({
      where: { organizationId: u.organizationId },
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People operations"
        icon={ClipboardCheck}
        title="Performance reviews"
        subtitle={isManager ? `${cycles.length} cycle${cycles.length === 1 ? "" : "s"} · ${reviews.length} reviews` : `${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
      />

      {isManager && cycles.length > 0 && (
        <section className="card overflow-hidden">
          <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
            <h3 className="text-sm font-semibold">Review cycles</h3>
          </header>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {cycles.map(c => (
              <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                <ClipboardCheck className="w-4 h-4 text-brand-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-[11px] text-ink-500">
                    {c.status} · created {new Date(c.createdAt).toLocaleDateString()}
                    {c.closesAt && <> · closes {new Date(c.closesAt).toLocaleDateString()}</>}
                  </div>
                </div>
                <span className={c.status === "active" ? "badge-green" : c.status === "closed" ? "badge-gray" : "badge-amber"}>{c.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reviews.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardCheck}
            tone="brand"
            title="No reviews yet"
            description={isManager
              ? "Start a review cycle from the API or wire up the cycle creator. Reviews live here as they're filed."
              : "When you're reviewed, your manager submits it here and you'll see + acknowledge it."}
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {reviews.map(r => (
            <li key={r.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  r.submittedAt && r.acknowledgedAt ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : r.submittedAt ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-ink-100 dark:bg-ink-800 text-ink-500"
                }`}>
                  {r.acknowledgedAt ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <b>{r.reviewerMember.user.name}</b>
                    <span className="text-ink-500"> reviewed </span>
                    <b>{r.subjectMember.user.name}</b>
                    <span className="badge-gray text-[10px] ml-2">{r.type}</span>
                  </div>
                  <div className="text-[11px] text-ink-500">
                    {r.cycle.name} · {r.submittedAt ? `submitted ${relTime(r.submittedAt)}` : "draft"}
                    {r.acknowledgedAt && ` · acknowledged ${relTime(r.acknowledgedAt)}`}
                  </div>
                  {r.overallRating != null && (
                    <div className="mt-1 text-xs">
                      Overall: <span className="font-bold text-brand-600 dark:text-brand-400">{r.overallRating}/5</span>
                    </div>
                  )}
                </div>
                {/* The drill-down view isn't built yet; we render the
                    review summary inline (who-reviewed-who, type, rating,
                    cycle, dates) which is what a manager actually needs
                    to triage. Skipping the trailing "coming soon" — it
                    read as a broken promise on every row. */}
                <span className={`badge text-[10px] shrink-0 ${
                  r.acknowledgedAt
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : r.submittedAt
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400"
                }`}>
                  {r.acknowledgedAt ? "Acknowledged" : r.submittedAt ? "Submitted" : "Draft"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
