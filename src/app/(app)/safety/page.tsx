import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { SafetyClient } from "@/components/construction/safety-client";
import { HardHat } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SafetyPage() {
  const u = await requireUser();
  const briefings = await prisma.safetyBriefing.findMany({
    where: { organizationId: u.organizationId, postedAt: { gte: addDays(new Date(), -7) } },
    include: {
      acks: { include: { member: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: { postedAt: "desc" },
    take: 50,
  });

  const memberCount = await prisma.member.count({ where: { organizationId: u.organizationId, status: "active" } });

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Construction"
        icon={HardHat}
        title="Daily safety briefings"
        subtitle="Post the day's safety topic. Every crew member must acknowledge before clocking in."
      />

      <SafetyClient
        isManager={u.role !== "EMPLOYEE"}
        myMemberId={u.memberId ?? null}
        totalMembers={memberCount}
        initial={briefings.map(b => ({
          id: b.id, topic: b.topic, details: b.details,
          postedAt: b.postedAt.toISOString(),
          acks: b.acks.map(a => ({ memberId: a.memberId, name: a.member.user.name, ackedAt: a.ackedAt.toISOString() })),
          ackedByMe: u.memberId ? b.acks.some(a => a.memberId === u.memberId) : false,
        }))}
      />
    </div>
  );
}
