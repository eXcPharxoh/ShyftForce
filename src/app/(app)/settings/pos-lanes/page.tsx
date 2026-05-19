import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PosLanesClient } from "@/components/settings/pos-lanes-client";
import { ScanLine } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PosLanesPage() {
  const u = await requireManagerOrAdmin();
  const [lanes, locations] = await Promise.all([
    prisma.posLane.findMany({
      where: { organizationId: u.organizationId },
      include: { location: { select: { name: true } } },
      orderBy: [{ locationId: "asc" }, { number: "asc" }],
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Grocery · Front-End"
        icon={ScanLine}
        title="Cashier lanes"
        subtitle="Set up your front-end lanes. Assign cashiers to specific registers during peak so the line never builds up."
      />
      <PosLanesClient
        initial={lanes.map(l => ({
          id: l.id, number: l.number, name: l.name, type: l.type, active: l.active,
          locationId: l.locationId, locationName: l.location.name,
        }))}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
      />
    </div>
  );
}
