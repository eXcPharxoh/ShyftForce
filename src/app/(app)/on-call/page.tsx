import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { OnCallClient } from "@/components/on-call/on-call-client";
import { Phone } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OnCallPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const since = addDays(new Date(), -7);

  const [items, members, locations] = await Promise.all([
    prisma.onCallShift.findMany({
      where: {
        organizationId: u.organizationId,
        startsAt: { gte: since },
        ...(isManager ? {} : { memberId: u.memberId ?? "" }),
      },
      include: { member: { include: { user: { select: { name: true } } } }, location: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
      take: 200,
    }),
    isManager ? prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active", role: { not: "ADMIN" } },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }) : [],
    isManager ? prisma.location.findMany({
      where: { organizationId: u.organizationId },
      orderBy: { name: "asc" },
    }) : [],
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow={isManager ? "Healthcare · Manager" : "On-call rotation"}
        icon={Phone}
        title="On-call schedule"
        subtitle={isManager
          ? "Daily stipend + called-in premium. The rotation suggestor balances on-call hours across your team."
          : "Your upcoming on-call windows. Log called-in hours after the fact for premium pay."}
      />

      <OnCallClient
        isManager={isManager}
        initial={items.map(o => ({
          id: o.id,
          memberId: o.memberId,
          memberName: o.member.user.name,
          locationName: o.location?.name ?? null,
          startsAt: o.startsAt.toISOString(),
          endsAt: o.endsAt.toISOString(),
          stipendCents: o.stipendCents,
          calledInHours: o.calledInHours,
          calledInPremiumMultiplier: o.calledInPremiumMultiplier,
          notes: o.notes,
        }))}
        members={members.map(m => ({ id: m.id, name: m.user.name }))}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
      />
    </div>
  );
}
