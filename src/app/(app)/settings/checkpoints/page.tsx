import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { AddCheckpointForm } from "@/components/checkpoints/add-form";
import { DeleteCheckpointButton } from "@/components/checkpoints/delete-button";
import { MapPin, QrCode, ClipboardCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CheckpointsPage() {
  const u = await requireManagerOrAdmin();
  const [posts, locations] = await Promise.all([
    prisma.checkpointPost.findMany({
      where: { organizationId: u.organizationId, active: true },
      include: {
        location: true,
        scans: { orderBy: { at: "desc" }, take: 1 },
      },
      orderBy: [{ locationId: "asc" }, { expectedSequence: "asc" }, { name: "asc" }],
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  // Group by location
  const byLocation = new Map<string, typeof posts>();
  for (const p of posts) {
    if (!byLocation.has(p.locationId)) byLocation.set(p.locationId, [] as any);
    (byLocation.get(p.locationId) as any).push(p);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Security"
        icon={ClipboardCheck}
        title="Patrol checkpoints"
        subtitle={`${posts.length} active post${posts.length === 1 ? "" : "s"} across ${byLocation.size} location${byLocation.size === 1 ? "" : "s"} — print the QR codes and post them at each tour point`}
      />

      <section className="card p-5">
        <h3 className="text-sm font-bold mb-3">Add a checkpoint</h3>
        <AddCheckpointForm locations={locations.map(l => ({ id: l.id, name: l.name }))} />
      </section>

      {locations.map((loc) => {
        const locPosts = byLocation.get(loc.id) ?? [];
        if (locPosts.length === 0) return null;
        return (
          <section key={loc.id} className="card overflow-hidden">
            <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-ink-500" />
              <h3 className="text-sm font-semibold">{loc.name} · {locPosts.length} post{locPosts.length === 1 ? "" : "s"}</h3>
            </header>
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {locPosts.map((p) => {
                const lastScan = p.scans[0];
                return (
                  <li key={p.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center shrink-0">
                      <QrCode className="w-6 h-6 text-ink-700 dark:text-ink-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{p.expectedSequence > 0 && <span className="text-ink-400 mr-1">#{p.expectedSequence}</span>}{p.name}</div>
                      <div className="text-[11px] text-ink-500 dark:text-ink-400">
                        QR token: <span className="font-mono">{p.qrToken.slice(0, 10)}…</span>
                        {p.latitude != null && p.longitude != null && <> · GPS {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</>}
                      </div>
                      {lastScan && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Last scan: {new Date(lastScan.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          {lastScan.withinGeofence === false && <span className="text-rose-600"> · outside geofence!</span>}
                        </div>
                      )}
                    </div>
                    <a href={`/checkpoints/print/${p.qrToken}`} target="_blank" className="btn-outline text-xs">
                      <QrCode className="w-3.5 h-3.5" /> Print QR
                    </a>
                    <DeleteCheckpointButton id={p.id} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
