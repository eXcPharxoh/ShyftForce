import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ConferencesClient } from "@/components/education/conferences-client";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConferencesPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  const where: any = { organizationId: u.organizationId, startsAt: { gte: new Date() } };
  if (!isManager) where.teacherMemberId = u.memberId ?? "";

  const [slots, teachers] = await Promise.all([
    prisma.conferenceSlot.findMany({
      where,
      include: {
        bookings: true,
        // No teacher relation - just memberId. Fetch teacher separately for display.
      },
      orderBy: { startsAt: "asc" },
      take: 200,
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const teacherNames: Record<string, string> = {};
  for (const t of teachers) teacherNames[t.id] = t.user.name;

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow={isManager ? "Education · Manager" : "My slots"}
        icon={Users}
        title="Parent-teacher conferences"
        subtitle={isManager
          ? "Open conference slots across all teachers. Help parents who can't book online."
          : "Your conference slots and current bookings."}
      />

      <ConferencesClient
        isManager={isManager}
        myMemberId={u.memberId ?? null}
        initial={slots.map(s => ({
          id: s.id,
          teacherId: s.teacherMemberId,
          teacherName: teacherNames[s.teacherMemberId] ?? "Teacher",
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          notes: s.notes,
          booking: s.bookings[0] ? {
            parentName: s.bookings[0].parentName,
            studentName: s.bookings[0].studentName,
            parentEmail: s.bookings[0].parentEmail,
            parentPhone: s.bookings[0].parentPhone,
            notes: s.bookings[0].notes,
          } : null,
        }))}
        teachers={teachers.map(t => ({ id: t.id, name: t.user.name }))}
      />
    </div>
  );
}
