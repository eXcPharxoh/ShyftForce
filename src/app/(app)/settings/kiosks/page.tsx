import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { KiosksClient } from "@/components/settings/kiosks-client";
import { Tablet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KiosksPage() {
  const u = await requireManagerOrAdmin();
  const [devices, locations] = await Promise.all([
    prisma.kioskDevice.findMany({
      where: { organizationId: u.organizationId },
      include: { location: { select: { name: true } } },
      orderBy: { pairedAt: "desc" },
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Hardware"
        icon={Tablet}
        title="Kiosk devices"
        subtitle="Pair shared tablets at a clock-in station. Employees punch in with a 4–6 digit PIN — no login needed."
      />
      <KiosksClient
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
        initial={devices.map(d => ({
          id: d.id, name: d.name, locationId: d.locationId, locationName: d.location.name,
          pairedAt: d.pairedAt.toISOString(),
          lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
