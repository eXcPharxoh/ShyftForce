import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { SubPoolClient } from "@/components/settings/sub-pool-client";
import { GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubPoolPage() {
  const u = await requireManagerOrAdmin();
  const [pool, members] = await Promise.all([
    prisma.subPoolMember.findMany({
      where: { organizationId: u.organizationId },
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const poolMemberIds = new Set(pool.map(p => p.memberId));
  const availableMembers = members.filter(m => !poolMemberIds.has(m.id));

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Education · Substitute pool"
        icon={GraduationCap}
        title="Substitute teacher pool"
        subtitle="Active subs receive first-respond-wins texts when a regular teacher calls out. Set per-sub subjects + quiet hours."
      />
      <SubPoolClient
        initial={pool.map(s => ({
          id: s.id, memberId: s.memberId,
          name: s.member.user.name, email: s.member.user.email,
          subjects: s.subjects ? JSON.parse(s.subjects) : [],
          grades:   s.grades   ? JSON.parse(s.grades)   : [],
          hourlyRateCents: s.hourlyRateCents,
          isActive: s.isActive,
          preferredContactHour: s.preferredContactHour,
          latestContactHour: s.latestContactHour,
        }))}
        availableMembers={availableMembers.map(m => ({ id: m.id, name: m.user.name }))}
      />
    </div>
  );
}
