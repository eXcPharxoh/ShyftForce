import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { dateLabel } from "@/lib/utils";

export default async function SurveysPage() {
  const u = await requireUser();
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
          <p className="text-sm text-ink-500">{surveys.length} surveys · {totalMembers} potential respondents</p>
        </div>
        <button className="btn-primary">New survey</button>
      </header>

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
                <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="text-xs font-medium tabular-nums">{s.responses.length}/{totalMembers}</div>
              </div>
              <div className="text-[11px] text-ink-500 mt-1">{s._count.questions} questions · {pct}% response rate</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
