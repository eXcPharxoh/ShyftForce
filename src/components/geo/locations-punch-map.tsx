import { prisma } from "@/lib/prisma";
import { GeoMap, type GeoSite, type GeoPunch } from "@/components/geo/geo-map";
import { MapPin } from "lucide-react";

/**
 * Server component: pulls an org's geofenced sites + recent clock-in punches and
 * renders them on the map (green = inside the fence, amber = outside). This is
 * the visual answer to "is everyone actually punching in on-site?" — used on the
 * dashboard (24h) and the attendance audit view (wider window).
 */
export async function LocationsPunchMap({
  orgId,
  sinceHours = 24,
  title = "Live locations",
  subtitle,
  height = 340,
}: {
  orgId: string;
  sinceHours?: number;
  title?: string;
  subtitle?: string;
  height?: number;
}) {
  const since = new Date(Date.now() - sinceHours * 3600_000);

  const [locations, logs] = await Promise.all([
    prisma.location.findMany({
      where: { organizationId: orgId, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, name: true, latitude: true, longitude: true, geofenceRadiusMeters: true },
    }),
    prisma.attendanceLog.findMany({
      where: {
        member: { organizationId: orgId },
        latitude: { not: null },
        longitude: { not: null },
        at: { gte: since },
      },
      orderBy: { at: "desc" },
      take: 300,
      select: {
        latitude: true, longitude: true, withinGeofence: true, type: true, at: true,
        member: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  // Check whether there's ANY location at all (with or without coords) — so a
  // brand-new org sees a useful "add an address" nudge instead of just a blank.
  if (locations.length === 0) {
    const anyLocation = await prisma.location.count({ where: { organizationId: orgId } });
    if (anyLocation === 0) return null; // truly nothing yet — keep the page clean
    return (
      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </header>
        <div className="px-5 py-6 text-center">
          <div className="text-[13px] text-ink-300 font-medium">Your locations don&rsquo;t have coordinates yet.</div>
          <p className="text-[12px] text-ink-500 mt-1 max-w-md mx-auto">
            Add an address in <a href="/settings/locations" className="text-brand-300 underline">Locations</a> and the map will fill in — plus your geofence will actually work.
          </p>
        </div>
      </section>
    );
  }

  const sites: GeoSite[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    lat: l.latitude!,
    lng: l.longitude!,
    radius: l.geofenceRadiusMeters ?? 100,
  }));

  const punches: GeoPunch[] = logs.map((l) => ({
    lat: l.latitude!,
    lng: l.longitude!,
    inside: l.withinGeofence !== false, // null (no fence) counts as neutral/inside
    label: `${l.member.user.name} · ${l.type.replace("_", " ")} · ${new Date(l.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
  }));

  const outside = punches.filter((p) => !p.inside).length;

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <MapPin className="w-4 h-4 text-brand-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-ink-400"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Inside</span>
          <span className="inline-flex items-center gap-1.5 text-ink-400"><span className="w-2 h-2 rounded-full bg-amber-400" /> Outside{outside > 0 ? ` (${outside})` : ""}</span>
        </div>
      </header>
      <div className="p-3">
        <GeoMap sites={sites} punches={punches} height={height} />
      </div>
    </section>
  );
}
