import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { VehiclesClient } from "@/components/settings/vehicles-client";
import { Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const u = await requireManagerOrAdmin();
  const [vehicles, locations] = await Promise.all([
    prisma.vehicle.findMany({
      where: { organizationId: u.organizationId },
      include: {
        location: { select: { name: true } },
        assignments: {
          where: { shift: { startsAt: { gte: new Date() } } },
          include: { member: { include: { user: { select: { name: true } } } }, shift: { select: { startsAt: true, endsAt: true } } },
          take: 3,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow="Field service"
        icon={Truck}
        title="Fleet vehicles"
        subtitle="Assign vehicles to shifts. Track mileage, pair with pre-trip inspections, and lock unsafe vehicles out of dispatch."
      />

      <VehiclesClient
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
        initial={vehicles.map(v => ({
          id: v.id, name: v.name,
          locationId: v.locationId, locationName: v.location?.name ?? null,
          licensePlate: v.licensePlate, vin: v.vin,
          make: v.make, model: v.model, year: v.year,
          status: v.status,
          notes: v.notes,
          upcomingAssignments: v.assignments.map(a => ({
            id: a.id,
            memberName: a.member.user.name,
            startsAt: a.shift.startsAt.toISOString(),
            endsAt: a.shift.endsAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
