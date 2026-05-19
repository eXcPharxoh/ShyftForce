import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { MeetingRoomsClient } from "@/components/settings/meeting-rooms-client";
import { Video } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MeetingRoomsPage() {
  const u = await requireManagerOrAdmin();
  const [rooms, locations] = await Promise.all([
    prisma.meetingRoom.findMany({
      where: { organizationId: u.organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Office · Setup"
        icon={Video}
        title="Meeting rooms"
        subtitle="Add room inventory so teammates can reserve and avoid double-bookings."
      />
      <MeetingRoomsClient
        initial={rooms.map(r => ({
          id: r.id, name: r.name, capacity: r.capacity,
          hasVideo: r.hasVideo, hasWhiteboard: r.hasWhiteboard,
          notes: r.notes, active: r.active,
        }))}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
      />
    </div>
  );
}
