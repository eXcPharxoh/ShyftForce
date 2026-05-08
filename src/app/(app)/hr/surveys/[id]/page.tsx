import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function SurveyDetail({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const survey = await prisma.survey.findFirst({
    where: { id, organizationId: u.organizationId },
    include: { questions: { orderBy: { order: "asc" } }, responses: { include: { member: { include: { user: true } } } } },
  });
  if (!survey) notFound();
  const totalMembers = await prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } });
  const pct = totalMembers > 0 ? Math.round((survey.responses.length / totalMembers) * 1000) / 10 : 0;

  // Aggregate scale answers per question
  const aggregates: Record<string, { yes: number; no: number; scaleAvg: number; scaleCount: number; texts: string[] }> = {};
  for (const r of survey.responses) {
    let answers: any = {};
    try { answers = JSON.parse(r.answers); } catch {}
    for (const q of survey.questions) {
      aggregates[q.id] ??= { yes: 0, no: 0, scaleAvg: 0, scaleCount: 0, texts: [] };
      const ans = answers[`q${q.order}`];
      if (q.type === "yes_no") { if (ans === "yes") aggregates[q.id].yes++; else if (ans === "no") aggregates[q.id].no++; }
      if (q.type === "scale" && typeof ans === "number") { aggregates[q.id].scaleAvg += ans; aggregates[q.id].scaleCount++; }
      if (q.type === "text" && typeof ans === "string" && ans.trim()) aggregates[q.id].texts.push(ans);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
        {survey.description && <p className="text-sm text-ink-500 mt-1">{survey.description}</p>}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className={survey.status === "active" ? "badge-green" : "badge-gray"}>{survey.status}</span>
          <span className="text-ink-500">{survey.responses.length}/{totalMembers} responses · {pct}%</span>
        </div>
      </header>

      <div className="space-y-3">
        {survey.questions.map(q => {
          const agg = aggregates[q.id];
          return (
            <section key={q.id} className="card p-4">
              <div className="text-xs uppercase text-ink-500 font-medium mb-1">Question {q.order} · {q.type}</div>
              <h3 className="font-semibold mb-3">{q.question}</h3>
              {q.type === "yes_no" && (
                <div className="space-y-2">
                  <Bar label="Yes" value={agg.yes} max={agg.yes + agg.no} color="emerald" />
                  <Bar label="No" value={agg.no} max={agg.yes + agg.no} color="rose" />
                </div>
              )}
              {q.type === "scale" && (
                <div className="text-3xl font-bold">{agg.scaleCount > 0 ? (agg.scaleAvg / agg.scaleCount).toFixed(1) : "—"}<span className="text-sm font-normal text-ink-500"> / 5 avg ({agg.scaleCount} responses)</span></div>
              )}
              {q.type === "text" && (
                <ul className="space-y-1.5">
                  {agg.texts.length === 0 && <li className="text-xs text-ink-500">No free-text answers yet.</li>}
                  {agg.texts.slice(0, 5).map((t, i) => <li key={i} className="text-sm bg-ink-50 rounded-lg px-3 py-2">"{t}"</li>)}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: "emerald" | "rose" | "brand" }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const colorMap = { emerald: "bg-emerald-500", rose: "bg-rose-500", brand: "bg-brand-500" };
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-ink-500">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
        <div className={`h-full ${colorMap[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
