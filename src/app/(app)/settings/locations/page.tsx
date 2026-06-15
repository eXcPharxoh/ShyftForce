import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LocationSettingsRow } from "@/components/locations/location-settings-row";
import { LocationCreateForm } from "@/components/locations/location-create-form";
import { ImportLocationsButton } from "@/components/locations/import-locations-button";
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
        title="Your locations"
        subtitle="Add each place your team works. We use the address to draw a clock-in zone — people have to be inside it to punch in, so no one clocks in from home."
      >
        <ImportLocationsButton />
        <LocationCreateForm />
      </PageHeader>

      <section className="card overflow-hidden">
        {locations.length === 0 ? (
          <EmptyState
            icon={Building2}
            tone="brand"
            title="No locations yet"
            description='Add your first site to get GPS-verified clock-ins, an allowed clock-in area, and per-location budgets. Click "Add location" above.'
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

      {/* Visual preview of every location's clock-in area */}
      {locations.filter(l => l.latitude != null && l.longitude != null).length > 0 && (
        <section>
          <div className="text-[10px] uppercase tracking-wider font-medium text-brand-500 font-mono mb-2">
            Clock-in area preview
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
          <li>• <b>Need the exact spot?</b> Open Google Maps → right-click your location → click the numbers that appear to copy them.</li>
          <li>• <b>How big should the circle be?</b> 50m for one building, 100m for a campus, 500m+ for outdoor sites like construction.</li>
          <li>• <b>Someone clocks in from too far away?</b> We still record the punch but flag it as "away from location" so you can verify.</li>
          <li>• <b>How clock-in works:</b> when someone taps Clock In, their phone shares GPS. We check how far they are from this address — if they're inside the circle, they're in. No fancy maps service needed.</li>
        </ul>
      </div>
    </div>
  );
}
