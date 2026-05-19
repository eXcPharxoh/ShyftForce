import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EquipmentClient } from "@/components/settings/equipment-client";
import { Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.equipment.findMany({
    where: { organizationId: u.organizationId },
    include: {
      assignments: {
        where: { returnedAt: null },
        include: { member: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Construction · Assets"
        icon={Wrench}
        title="Equipment & tools"
        subtitle="Track compressors, generators, scaffolding, and PPE. Assign to shifts and mark for maintenance."
      />
      <EquipmentClient
        initial={items.map(e => ({
          id: e.id, name: e.name, category: e.category, serialNumber: e.serialNumber,
          status: e.status, notes: e.notes,
          currentHolder: e.assignments[0]?.member.user.name ?? null,
        }))}
      />
    </div>
  );
}
