import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { DepartmentsClient } from "@/components/settings/departments-client";
import { LayoutGrid } from "lucide-react";

export const dynamic = "force-dynamic";

const GROCERY_PRESETS = ["Produce", "Deli", "Bakery", "Meat & Seafood", "Dairy", "Frozen", "Grocery", "Front-End / Cashier", "Floral", "Pharmacy"];
const RETAIL_PRESETS  = ["Apparel - Mens", "Apparel - Womens", "Apparel - Kids", "Footwear", "Electronics", "Beauty", "Home", "Cashier", "Fitting Room", "Stockroom"];

export default async function DepartmentsPage() {
  const u = await requireManagerOrAdmin();
  const [depts, locations, members, org] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: u.organizationId },
      include: {
        location: { select: { name: true } },
        memberships: { include: { member: { include: { user: { select: { name: true } } } } } },
        _count: { select: { shifts: { where: { startsAt: { gte: new Date() } } } } },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.organization.findUnique({ where: { id: u.organizationId }, select: { industry: true } }),
  ]);

  const presets = org?.industry === "grocery" ? GROCERY_PRESETS : (org?.industry === "retail" ? RETAIL_PRESETS : []);

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow={org?.industry === "grocery" ? "Grocery" : org?.industry === "retail" ? "Retail" : "Setup"}
        icon={LayoutGrid}
        title="Departments"
        subtitle="Partition staff and shifts by section. The scheduler, coverage view, and reports all slice by department."
      />

      <DepartmentsClient
        initial={depts.map(d => ({
          id: d.id, name: d.name, color: d.color,
          locationId: d.locationId, locationName: d.location?.name ?? null,
          notes: d.notes, active: d.active,
          upcomingShifts: d._count.shifts,
          members: d.memberships.map(m => ({
            membershipId: m.id,
            memberId: m.memberId,
            name: m.member.user.name,
            isPrimary: m.isPrimary,
          })),
        }))}
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
        allMembers={members.map(m => ({ id: m.id, name: m.user.name }))}
        presets={presets}
      />
    </div>
  );
}
