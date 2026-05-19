import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceClient } from "@/components/office/workspace-client";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function WorkspacePage() {
  const u = await requireUser();
  const today = new Date(`${todayKey()}T00:00:00Z`);

  const [desks, rooms, members] = await Promise.all([
    prisma.hotDesk.findMany({
      where: { organizationId: u.organizationId, active: true },
      include: {
        bookings: {
          where: { date: today },
          include: { member: { include: { user: { select: { name: true } } } } },
        },
      },
      orderBy: [{ zone: "asc" }, { name: "asc" }],
    }),
    prisma.meetingRoom.findMany({
      where: { organizationId: u.organizationId, active: true },
      include: {
        bookings: {
          where: { startsAt: { gte: today, lt: new Date(today.getTime() + 86400_000) } },
          include: { organizer: { include: { user: { select: { name: true } } } } },
          orderBy: { startsAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        eyebrow="Office"
        icon={Building2}
        title="Workspace"
        subtitle="Book a hot-desk for today or reserve a meeting room. Live availability."
      />

      <WorkspaceClient
        myMemberId={u.memberId ?? null}
        todayKey={todayKey()}
        desks={desks.map(d => ({
          id: d.id, name: d.name, zone: d.zone,
          hasMonitor: d.hasMonitor, hasStanding: d.hasStanding,
          bookings: d.bookings.map(b => ({
            id: b.id, halfDay: b.halfDay,
            memberName: b.member.user.name, memberId: b.memberId,
          })),
        }))}
        rooms={rooms.map(r => ({
          id: r.id, name: r.name, capacity: r.capacity,
          hasVideo: r.hasVideo, hasWhiteboard: r.hasWhiteboard,
          bookings: r.bookings.map(b => ({
            id: b.id, title: b.title,
            startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString(),
            organizerName: b.organizer.user.name, organizerId: b.organizerId,
          })),
        }))}
        allMembers={members.map(m => ({ id: m.id, name: m.user.name }))}
      />
    </div>
  );
}
