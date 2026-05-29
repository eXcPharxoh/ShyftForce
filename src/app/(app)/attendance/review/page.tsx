import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { fmtDistance } from "@/lib/geo";
import { relTime } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, Camera, MapPin, ScanFace } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Manager review queue: every clock-in punch in the last 7 days that's flagged
 * — outside the geofence, face mismatch, or no GPS/photo (unverified). This
 * closes the loop on Flag-mode for face verification + the existing geofence
 * advisory: managers actually see what to review, not just a flag rotting in
 * the DB.
 */
export default async function AttendanceReviewPage() {
  const u = await requireUser();
  if (u.role !== "ADMIN" && u.role !== "MANAGER") redirect("/dashboard");

  const since = new Date(Date.now() - 7 * 86400_000);
  const punches = await prisma.attendanceLog.findMany({
    where: {
      member: { organizationId: u.organizationId },
      type: "clock_in",
      at: { gte: since },
      OR: [
        { withinGeofence: false },
        { faceMatch: false },
        { verified: false },
      ],
    },
    orderBy: { at: "desc" },
    take: 200,
    include: { member: { include: { user: true, location: true } } },
  });

  const outside  = punches.filter(p => p.withinGeofence === false).length;
  const faceMiss = punches.filter(p => p.faceMatch === false).length;
  const unverif  = punches.filter(p => p.verified === false).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Compliance"
        icon={ShieldCheck}
        title="Clock-in review"
        subtitle="Last 7 days · flagged punches — outside geofence, face mismatch, or unverified."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="To review" value={punches.length} tone="brand" />
        <Stat label="Outside fence" value={outside} tone={outside > 0 ? "warn" : "ink"} />
        <Stat label="Face mismatch" value={faceMiss} tone={faceMiss > 0 ? "danger" : "ink"} />
        <Stat label="Unverified" value={unverif} tone={unverif > 0 ? "warn" : "ink"} />
      </div>

      {punches.length === 0 ? (
        <div className="card p-10 text-center">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold">No flagged punches this week.</h3>
          <p className="text-[13px] text-ink-400 mt-1">Anyone who clocked in did so on-site, with the right face, with verification.</p>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <header className="px-5 py-3 border-b border-white/[0.06] text-sm font-semibold">Flagged punches</header>
          <ul className="divide-y divide-white/[0.06]">
            {punches.map((p) => (
              <li key={p.id} className="px-5 py-3 flex items-start gap-3">
                {p.photoData ? (
                  <img src={p.photoData} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/[0.08] shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-ink-800 flex items-center justify-center text-ink-500 shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-50 truncate">{p.member.user.name}</div>
                  <div className="text-[11px] text-ink-500 truncate">
                    {p.member.location?.name ?? "No location"} · {relTime(p.at)}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.withinGeofence === false && p.distanceMeters != null && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-medium">
                        <MapPin className="w-2.5 h-2.5" /> {fmtDistance(p.distanceMeters)} from site
                      </span>
                    )}
                    {p.faceMatch === false && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[10px] font-medium">
                        <ScanFace className="w-2.5 h-2.5" /> Face didn&rsquo;t match
                        {p.faceDistance != null && <> · d={p.faceDistance.toFixed(2)}</>}
                      </span>
                    )}
                    {p.verified === false && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink-800 text-ink-300 text-[10px] font-medium">
                        <AlertTriangle className="w-2.5 h-2.5" /> Unverified
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-ink-500 shrink-0">{p.at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
              </li>
            ))}
          </ul>
          <footer className="px-5 py-3 border-t border-white/[0.06] text-[11px] text-ink-500 flex items-center justify-between">
            <span>Showing last 200 of the past 7 days.</span>
            <Link href="/attendance" className="text-brand-300">Back to attendance →</Link>
          </footer>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ink" | "brand" | "warn" | "danger" }) {
  const text =
    tone === "brand"  ? "text-brand-300"  :
    tone === "warn"   ? "text-amber-300"  :
    tone === "danger" ? "text-rose-300"   :
                        "text-ink-200";
  return (
    <div className="card p-4 text-center">
      <div className={`text-2xl font-bold ${text}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mt-0.5">{label}</div>
    </div>
  );
}
