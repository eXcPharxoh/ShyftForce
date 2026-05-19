import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ClassScheduleClient } from "@/components/fitness/class-schedule-client";
import { Dumbbell } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const [occurrences, classes, instructors] = await Promise.all([
    prisma.classOccurrence.findMany({
      where: {
        fitnessClass: { organizationId: u.organizationId },
        startsAt: { gte: new Date(), lt: addDays(new Date(), 14) },
      },
      include: {
        fitnessClass: { select: { name: true, color: true, capacity: true } },
        instructor:   { include: { user: { select: { name: true } } } },
      },
      orderBy: { startsAt: "asc" },
      take: 200,
    }),
    prisma.fitnessClass.findMany({
      where: { organizationId: u.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
    isManager ? prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }) : [],
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow={isManager ? "Fitness · Manager" : "Class schedule"}
        icon={Dumbbell}
        title="Class schedule"
        subtitle={isManager
          ? "Next 14 days of group classes. Assign instructors and track attendance."
          : "Your assigned classes for the next 2 weeks."}
      />

      <ClassScheduleClient
        isManager={isManager}
        myMemberId={u.memberId ?? null}
        initial={occurrences.map(o => ({
          id: o.id,
          className: o.fitnessClass.name,
          color: o.fitnessClass.color,
          capacity: o.fitnessClass.capacity,
          instructorName: o.instructor.user.name,
          instructorId: o.instructorMemberId,
          startsAt: o.startsAt.toISOString(),
          endsAt: o.endsAt.toISOString(),
          room: o.room,
          status: o.status,
          attendees: o.attendees,
          notes: o.notes,
        }))}
        classes={classes.map(c => ({ id: c.id, name: c.name, color: c.color, durationMins: c.durationMins }))}
        instructors={instructors.map(m => ({ id: m.id, name: m.user.name }))}
      />
    </div>
  );
}
