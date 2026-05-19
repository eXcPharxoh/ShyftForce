import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { RoomsClient } from "@/components/hospitality/rooms-client";
import { Bed } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const [rooms, members] = await Promise.all([
    prisma.hotelRoom.findMany({
      where: { organizationId: u.organizationId },
      include: {
        assignments: {
          where: { completedAt: null },
          include: { member: { include: { user: { select: { name: true } } } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ floor: "asc" }, { number: "asc" }],
    }),
    isManager ? prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }) : [],
  ]);

  const byStatus: Record<string, number> = { clean: 0, dirty: 0, cleaning: 0, out_of_order: 0 };
  for (const r of rooms) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        eyebrow="Hospitality · Housekeeping"
        icon={Bed}
        title="Rooms"
        subtitle="Live room-status board. Assign housekeepers, mark complete, track turn time."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{byStatus.clean}</div>
          <div className="text-[11px] uppercase tracking-wider text-ink-500">Clean</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-rose-600">{byStatus.dirty}</div>
          <div className="text-[11px] uppercase tracking-wider text-ink-500">Dirty</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{byStatus.cleaning}</div>
          <div className="text-[11px] uppercase tracking-wider text-ink-500">Cleaning</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-ink-500">{byStatus.out_of_order}</div>
          <div className="text-[11px] uppercase tracking-wider text-ink-500">Out of order</div>
        </div>
      </section>

      <RoomsClient
        isManager={isManager}
        myMemberId={u.memberId ?? null}
        initial={rooms.map(r => ({
          id: r.id, number: r.number, floor: r.floor, type: r.type, status: r.status, notes: r.notes,
          currentHousekeeper: r.assignments[0]?.member.user.name ?? null,
          currentHousekeeperId: r.assignments[0]?.memberId ?? null,
          currentAssignmentId: r.assignments[0]?.id ?? null,
          assignmentStartedAt: r.assignments[0]?.startedAt?.toISOString() ?? null,
        }))}
        members={members.map(m => ({ id: m.id, name: m.user.name }))}
      />
    </div>
  );
}
