import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PtSessionsClient } from "@/components/fitness/pt-sessions-client";
import { UserCheck } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PtSessionsPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const where: any = {
    organizationId: u.organizationId,
    startsAt: { gte: addDays(new Date(), -7), lt: addDays(new Date(), 30) },
  };
  if (!isManager) where.trainerMemberId = u.memberId ?? "";

  const [sessions, members] = await Promise.all([
    prisma.ptSession.findMany({
      where,
      include: { trainer: { include: { user: { select: { name: true } } } } },
      orderBy: { startsAt: "asc" },
      take: 200,
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  // Compute trainer payout summary
  const totalPay = sessions
    .filter(s => s.status === "done")
    .reduce((a, s) => a + Math.round(s.rateCents * s.trainerSplitPct / 100), 0);
  const totalGross = sessions.filter(s => s.status === "done").reduce((a, s) => a + s.rateCents, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow={isManager ? "Fitness · Manager" : "My PT sessions"}
        icon={UserCheck}
        title="Personal training"
        subtitle={isManager
          ? "All trainer 1:1 sessions in the last 7 days + next 30. Revenue + trainer-split payout tracked per session."
          : "Your booked + completed sessions for the last 7 days and next 30."}
      />

      <section className="card p-5 bg-gradient-to-br from-emerald-50 to-brand-50 dark:from-emerald-500/10 dark:to-brand-500/10 border-brand-200/60 dark:border-brand-500/30">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] uppercase font-semibold tracking-wider text-brand-700 dark:text-brand-300">{isManager ? "Trainer payout (completed)" : "My payout (completed)"}</div>
            <div className="text-3xl font-bold tracking-tight-2 mt-0.5">${(totalPay / 100).toLocaleString()}</div>
            <p className="text-xs text-ink-500 mt-1">Gross revenue: ${(totalGross / 100).toLocaleString()}</p>
          </div>
        </div>
      </section>

      <PtSessionsClient
        isManager={isManager}
        myMemberId={u.memberId ?? null}
        initial={sessions.map(s => ({
          id: s.id,
          trainerId: s.trainerMemberId, trainerName: s.trainer.user.name,
          clientName: s.clientName, clientPhone: s.clientPhone,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          rateCents: s.rateCents, trainerSplitPct: s.trainerSplitPct,
          trainerPayCents: Math.round(s.rateCents * s.trainerSplitPct / 100),
          status: s.status, notes: s.notes,
        }))}
        trainers={members.map(m => ({ id: m.id, name: m.user.name }))}
      />
    </div>
  );
}
