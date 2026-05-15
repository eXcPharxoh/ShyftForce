import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { dateLabel } from "@/lib/utils";
import { NewSurveyButton } from "@/components/hr/new-survey-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileCheck2 } from "lucide-react";

export default async function SurveysPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const surveys = await prisma.survey.findMany({
    where: { organizationId: u.organizationId },
    include: { responses: true, _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });
  const totalMembers = await prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } });

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Surveys</h1>
          <p className="text-sm text-ink-500">{surveys.length} survey{surveys.length === 1 ? "" : "s"} · {totalMembers} potential respondents</p>
        </div>
        {isManager && <NewSurveyButton />}
      </header>

      {surveys.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileCheck2}
            tone="brand"
            title="No surveys yet"
            description={isManager
              ? "Run quick eNPS pulses or targeted feedback drives. Start from a template or build your own from scratch."
              : "Your manager hasn't launched any surveys yet. When they do, you'll get a notification."}
            action={isManager ? <NewSurveyButton /> : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {surveys.map(s => {
            const pct = totalMembers > 0 ? Math.round((s.responses.length / totalMembers) * 1000) / 10 : 0;
            return (
              <Link key={s.id} href={`/hr/surveys/${s.id}`} className="card card-hover p-4 block">
                <div className="flex items-center justify-between mb-2">
                  <span className={s.status === "active" ? "badge-green" : "badge-gray"}>{s.status}</span>
                  <span className="text-[11px] text-ink-500">{dateLabel(s.createdAt)}</span>
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                {s.description && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{s.description}</p>}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <div className="text-xs font-medium tabular-nums">{s.responses.length}/{totalMembers}</div>
                </div>
                <div className="text-[11px] text-ink-500 mt-1">{s._count.questions} question{s._count.questions === 1 ? "" : "s"} · {pct}% response rate</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
