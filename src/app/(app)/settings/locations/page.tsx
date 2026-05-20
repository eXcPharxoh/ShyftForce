import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LocationSettingsRow } from "@/components/locations/location-settings-row";
import { LocationCreateForm } from "@/components/locations/location-create-form";
import { GeofenceMap } from "@/components/ui/geofence-map";
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

      {/* Visual preview of every location's geofence */}
      {locations.filter(l => l.latitude != null && l.longitude != null).length > 0 && (
        <section>
          <div className="text-[10px] uppercase tracking-wider font-medium text-brand-500 font-mono mb-2">
            Geofence preview
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {locations
              .filter(l => l.latitude != null && l.longitude != null)
              .slice(0, 4)
              .map(l => (
                <div key={l.id} className="card p-3">
                  <div className="text-[13px] font-semibold mb-2 truncate">{l.name}</div>
                  <GeofenceMap
                    centerName={l.name}
                    centerLat={l.latitude!}
                    centerLng={l.longitude!}
                    radiusMeters={l.geofenceRadiusMeters ?? 100}
                    height={200}
                  />
                </div>
              ))}
          </div>
        </section>
      )}

      <div className="card p-4 text-xs text-ink-500 leading-relaxed">
        <div className="font-semibold mb-1 text-ink-300">Tips</div>
        <ul className="space-y-1">
          <li>• Find coordinates fast: open Google Maps → right-click your site → click the lat/lng to copy.</li>
          <li>• Typical radius: 50m for a single building, 100m for a campus, 500m+ for outdoor sites.</li>
          <li>• Clock-ins outside the geofence are still recorded but flagged as <b>outside</b> for manager review.</li>
          <li>• <b>How geofencing works:</b> the employee's browser requests GPS via <code>navigator.geolocation</code> when they tap Clock In. The server computes haversine distance from your set point, then compares to the radius. We don't ping a paid maps API — works offline-friendly, no API keys needed.</li>
        </ul>
      </div>
    </div>
  );
}
