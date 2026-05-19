import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { FitnessClassesClient } from "@/components/settings/fitness-classes-client";
import { Dumbbell } from "lucide-react";

export const dynamic = "force-dynamic";

const PRESETS = [
  { name: "Yoga",       durationMins: 60, color: "#10b981" },
  { name: "Spin",       durationMins: 45, color: "#ef4444" },
  { name: "HIIT",       durationMins: 30, color: "#f59e0b" },
  { name: "Pilates",    durationMins: 50, color: "#8b5cf6" },
  { name: "Bootcamp",   durationMins: 60, color: "#06b6d4" },
  { name: "Zumba",      durationMins: 60, color: "#ec4899" },
  { name: "Barre",      durationMins: 55, color: "#6366f1" },
];

export default async function FitnessClassesPage() {
  const u = await requireManagerOrAdmin();
  const classes = await prisma.fitnessClass.findMany({
    where: { organizationId: u.organizationId },
    include: { _count: { select: { occurrences: { where: { startsAt: { gte: new Date() } } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Fitness · Setup"
        icon={Dumbbell}
        title="Class templates"
        subtitle="Define your group fitness offerings. Schedule individual occurrences under /classes."
      />

      <FitnessClassesClient
        initial={classes.map(c => ({
          id: c.id, name: c.name, durationMins: c.durationMins,
          capacity: c.capacity, color: c.color,
          description: c.description, active: c.active,
          upcomingOccurrences: c._count.occurrences,
        }))}
        presets={PRESETS}
      />
    </div>
  );
}
