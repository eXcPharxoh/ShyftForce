import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ChecklistsClient } from "@/components/settings/checklists-client";
import { ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
  const u = await requireManagerOrAdmin();
  const [templates, locations] = await Promise.all([
    prisma.checklistTemplate.findMany({
      where: { organizationId: u.organizationId, active: true },
      include: { location: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Standards & ops"
        icon={ListChecks}
        title="Shift checklists"
        subtitle="Required completion before clock-out. Photo verification optional per item. Use for side-work, opens, closes, safety walks."
      />
      <ChecklistsClient
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
        initial={templates.map(t => ({
          id: t.id, name: t.name, trigger: t.trigger,
          requireCompletion: t.requireCompletion,
          locationId: t.locationId, locationName: t.location?.name ?? null,
          items: safe(t.items),
          positions: t.positions ? safe(t.positions) : null,
        }))}
      />
    </div>
  );
}

function safe(s: string): any { try { return JSON.parse(s); } catch { return []; } }
