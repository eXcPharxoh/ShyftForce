import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { CrewsClient } from "@/components/settings/crews-client";
import { HardHat } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CrewsPage() {
  const u = await requireManagerOrAdmin();
  const [crews, members] = await Promise.all([
    prisma.crew.findMany({
      where: { organizationId: u.organizationId },
      include: {
        foreman: { include: { user: { select: { name: true } } } },
        memberships: { include: { member: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow="Construction"
        icon={HardHat}
        title="Crews"
        subtitle="Group workers into crews with a foreman. Schedule by crew, hold safety stand-ups, and assign equipment."
      />
      <CrewsClient
        initial={crews.map(c => ({
          id: c.id, name: c.name, color: c.color, notes: c.notes, active: c.active,
          foremanId: c.foremanId, foremanName: c.foreman?.user.name ?? null,
          members: c.memberships.map(m => ({ memberId: m.memberId, name: m.member.user.name, role: m.role })),
        }))}
        allMembers={members.map(m => ({ id: m.id, name: m.user.name }))}
      />
    </div>
  );
}
