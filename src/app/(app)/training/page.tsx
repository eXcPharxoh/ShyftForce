import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GraduationCap, CheckCircle2, PlayCircle, Clock } from "lucide-react";

const CATEGORY_BADGE: Record<string, string> = {
  onboarding: "badge bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  safety:     "badge bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  compliance: "badge bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  skills:     "badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  other:      "badge-gray",
};

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const courses = await prisma.course.findMany({
    where: { organizationId: u.organizationId, published: true },
    include: {
      _count: { select: { lessons: true } },
      enrollments: { where: { memberId: u.memberId }, select: { startedAt: true, completedAt: true, score: true } },
    },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Learning & development"
        icon={GraduationCap}
        title="Training"
        subtitle={`${courses.length} course${courses.length === 1 ? "" : "s"} available`}
      >
        {isManager && <Link href="/training/author" className="btn-primary text-sm">+ New course</Link>}
      </PageHeader>

      {courses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={GraduationCap}
            tone="brand"
            title={isManager ? "No courses yet" : "No training assigned"}
            description={isManager
              ? "Author your first course. Use it for onboarding, safety, compliance, or skill-building."
              : "Your manager will publish courses here when they're ready."}
            action={isManager ? <Link href="/training/author" className="btn-primary">Create a course</Link> : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map(c => {
            const e = c.enrollments[0];
            const completed = !!e?.completedAt;
            const started = !!e?.startedAt && !completed;
            const badge = CATEGORY_BADGE[c.category ?? "other"] ?? "badge-gray";
            return (
              <Link key={c.id} href={`/training/${c.id}`} className="card card-hover p-5 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className={badge + " text-[10px]"}>{c.category ?? "other"}</span>
                  {completed && <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 flex items-center gap-1 text-[10px]"><CheckCircle2 className="w-3 h-3" /> {e?.score ?? "✓"}</span>}
                  {started && <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 text-[10px]">In progress</span>}
                </div>
                <h3 className="font-bold text-base leading-tight">{c.title}</h3>
                {c.description && <p className="text-xs text-ink-500 dark:text-ink-400 line-clamp-3">{c.description}</p>}
                <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-ink-500 dark:text-ink-400">
                  <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" /> {c._count.lessons} lesson{c._count.lessons === 1 ? "" : "s"}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.estimatedMinutes} min</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
