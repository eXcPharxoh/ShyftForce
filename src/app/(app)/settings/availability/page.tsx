import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AvailabilityEditor } from "@/components/availability/editor";
import { AvailabilityList } from "@/components/availability/list";
import { Calendar } from "lucide-react";

export default async function AvailabilityPage() {
  const u = await requireUser();
  const items = await prisma.availabilityRule.findMany({
    where: { memberId: u.memberId },
    orderBy: [{ date: "asc" }, { dayOfWeek: "asc" }],
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Your preferences"
        icon={Calendar}
        title="Availability"
        subtitle="Tell us when you can't work. The Auto-Scheduler and managers will respect these rules."
      >
        <AvailabilityEditor />
      </PageHeader>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Calendar}
            tone="brand"
            title="You're available all the time"
            description="Add a rule above to mark a recurring weekly day/time you can't work, or block a specific date."
          />
        </div>
      ) : (
        <AvailabilityList
          items={items.map(i => ({
            id: i.id, type: i.type,
            dayOfWeek: i.dayOfWeek, startTime: i.startTime, endTime: i.endTime,
            date: i.date?.toISOString() ?? null, notes: i.notes,
          }))}
        />
      )}
    </div>
  );
}
