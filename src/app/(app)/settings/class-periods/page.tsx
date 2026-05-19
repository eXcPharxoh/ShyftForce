import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ClassPeriodsClient } from "@/components/settings/class-periods-client";
import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClassPeriodsPage() {
  const u = await requireManagerOrAdmin();
  const periods = await prisma.classPeriod.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { number: "asc" },
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Education · Setup"
        icon={Clock}
        title="Class periods (bells)"
        subtitle="Set your bell schedule. Teacher shifts can then be tied to a specific period."
      />
      <ClassPeriodsClient
        initial={periods.map(p => ({
          id: p.id, number: p.number, name: p.name,
          startTime: p.startTime, endTime: p.endTime,
          daysOfWeek: JSON.parse(p.daysOfWeek),
          active: p.active,
        }))}
      />
    </div>
  );
}
