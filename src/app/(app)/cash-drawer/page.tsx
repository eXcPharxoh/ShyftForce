import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { CashDrawerClient } from "@/components/cash-drawer/cash-drawer-client";
import { Banknote } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CashDrawerPage() {
  const u = await requireUser();
  const [sessions, locations] = await Promise.all([
    prisma.cashDrawerSession.findMany({
      where: { organizationId: u.organizationId },
      include: { member: { include: { user: { select: { name: true } } } }, location: { select: { name: true } } },
      orderBy: { openedAt: "desc" },
      take: 30,
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  const mySession = sessions.find(s => s.memberId === u.memberId && !s.closedAt);

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Cash handling"
        icon={Banknote}
        title="Cash drawer"
        subtitle="Open a session at the start of your shift, close it with a count when you leave. Variances are flagged for manager review."
      />
      <CashDrawerClient
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
        mySession={mySession ? {
          id: mySession.id,
          locationName: mySession.location.name,
          openCountCents: mySession.openCountCents,
          openedAt: mySession.openedAt.toISOString(),
        } : null}
        history={sessions.filter(s => s.closedAt).map(s => ({
          id: s.id,
          memberName: s.member.user.name,
          locationName: s.location.name,
          openedAt: s.openedAt.toISOString(),
          closedAt: s.closedAt!.toISOString(),
          openCountCents: s.openCountCents,
          closeCountCents: s.closeCountCents ?? 0,
          expectedCents: s.expectedCents,
          varianceCents: s.varianceCents,
          varianceReason: s.varianceReason,
        }))}
      />
    </div>
  );
}
