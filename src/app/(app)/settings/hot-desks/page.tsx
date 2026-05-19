import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { HotDesksClient } from "@/components/settings/hot-desks-client";
import { Armchair } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HotDesksPage() {
  const u = await requireManagerOrAdmin();
  const [desks, locations] = await Promise.all([
    prisma.hotDesk.findMany({
      where: { organizationId: u.organizationId },
      orderBy: [{ zone: "asc" }, { name: "asc" }],
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Office · Setup"
        icon={Armchair}
        title="Hot desks"
        subtitle="Add desk inventory so hybrid teammates can book a workspace for the day."
      />
      <HotDesksClient
        initial={desks.map(d => ({
          id: d.id, name: d.name, zone: d.zone,
          hasMonitor: d.hasMonitor, hasStanding: d.hasStanding,
          active: d.active, locationId: d.locationId,
        }))}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
      />
    </div>
  );
}
