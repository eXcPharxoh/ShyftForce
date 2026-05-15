import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LocationSettingsRow } from "@/components/locations/location-settings-row";
import { LocationCreateForm } from "@/components/locations/location-create-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default async function LocationSettingsPage() {
  const u = await requireManagerOrAdmin();
  const locations = await prisma.location.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Workspace"
        icon={Building2}
        title="Locations & geofences"
        subtitle="Set GPS coordinates and geofence radius for each site. Affects clock-in verification."
      >
        <LocationCreateForm />
      </PageHeader>

      <section className="card overflow-hidden">
        {locations.length === 0 ? (
          <EmptyState
            icon={Building2}
            tone="brand"
            title="No locations yet"
            description='Add your first site to get GPS-verified clock-ins, geofence enforcement, and per-location budgets. Click "Add location" above.'
          />
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {locations.map(l => (
              <LocationSettingsRow key={l.id} location={{
                id: l.id, name: l.name,
                latitude: l.latitude, longitude: l.longitude,
                geofenceRadiusMeters: l.geofenceRadiusMeters ?? 100,
              }} />
            ))}
          </ul>
        )}
      </section>

      <div className="text-xs text-ink-500 leading-relaxed bg-ink-50 rounded-xl p-4">
        <div className="font-semibold mb-1">Tips</div>
        <ul className="space-y-1">
          <li>• Find coordinates fast: open Google Maps → right-click your site → click the lat/lng to copy.</li>
          <li>• Typical radius: 50m for a single building, 100m for a campus, 500m+ for outdoor sites.</li>
          <li>• Clock-ins outside the geofence are still recorded but flagged as <b>outside</b> for manager review.</li>
        </ul>
      </div>
    </div>
  );
}
