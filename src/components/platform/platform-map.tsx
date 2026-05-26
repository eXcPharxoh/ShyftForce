import { prisma } from "@/lib/prisma";
import { GeoMap, type GeoSite } from "@/components/geo/geo-map";
import { Globe2 } from "lucide-react";

/**
 * Platform-wide map: every customer location (with coords) on one map, so the
 * operator can see geographic spread/usage across all orgs at a glance.
 */
export async function PlatformMap() {
  const locations = await prisma.location.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: {
      id: true, name: true, latitude: true, longitude: true, geofenceRadiusMeters: true,
      organization: { select: { name: true } },
    },
    take: 1000,
  });

  const sites: GeoSite[] = locations.map((l) => ({
    id: l.id,
    name: `${l.organization.name} · ${l.name}`,
    lat: l.latitude!,
    lng: l.longitude!,
    radius: l.geofenceRadiusMeters ?? 100,
  }));

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
        <Globe2 className="w-4 h-4 text-ink-500" />
        <h3 className="text-sm font-semibold">Customer locations</h3>
        <span className="text-[11px] text-ink-500">{sites.length} geofenced site{sites.length === 1 ? "" : "s"}</span>
      </header>
      <div className="p-3">
        <GeoMap sites={sites} height={380} />
      </div>
    </section>
  );
}
