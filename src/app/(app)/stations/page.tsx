import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StationsClient } from "@/components/stations/stations-client";
import { MapPinned } from "lucide-react";
import { addDays, startOfWeek } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StationsPage() {
  const u = await requireManagerOrAdmin();
  const weekStart = startOfWeek(new Date());
  const weekEnd   = addDays(weekStart, 7);

  const [shifts, locations] = await Promise.all([
    prisma.shift.findMany({
      where: {
        location: { organizationId: u.organizationId },
        startsAt: { gte: weekStart, lt: weekEnd },
        memberId: { not: null },
      },
      include: {
        member: { include: { user: { select: { name: true } } } },
        location: { select: { name: true } },
        stationAssignments: true,
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Floor ops"
        icon={MapPinned}
        title="Section / station assignments"
        subtitle="Assign servers to sections, cooks to stations. The fair-rotation suggestor picks who's worked the station least in the last 30 days."
      />
      <StationsClient
        locations={locations}
        initial={shifts.map(s => ({
          id: s.id,
          memberId: s.memberId!,
          memberName: s.member!.user.name,
          locationId: s.locationId,
          locationName: s.location.name,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          position: s.position,
          currentStation: s.stationAssignments[0]?.station ?? null,
          assignmentId: s.stationAssignments[0]?.id ?? null,
        }))}
      />
    </div>
  );
}
