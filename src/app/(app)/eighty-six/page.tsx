import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EightySixClient } from "@/components/eighty-six/eighty-six-client";
import { Ban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EightySixPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const [items, locations] = await Promise.all([
    prisma.eightySixItem.findMany({
      where: { organizationId: u.organizationId, active: true },
      include: { location: { select: { name: true } } },
      orderBy: { markedAt: "desc" },
      take: 100,
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Floor ops"
        icon={Ban}
        title="86 list"
        subtitle={`${items.length} item${items.length === 1 ? "" : "s"} currently 86'd · servers get a push notification the moment something is marked`}
      />
      <EightySixClient
        isManager={isManager}
        initialItems={items.map(i => ({
          id: i.id, name: i.name, category: i.category, notes: i.notes,
          locationId: i.locationId, locationName: i.location.name,
          markedAt: i.markedAt.toISOString(),
        }))}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
      />
    </div>
  );
}
