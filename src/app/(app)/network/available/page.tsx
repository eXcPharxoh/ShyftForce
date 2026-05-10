import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkerProfile } from "@/lib/network/profile";
import { PageHeader } from "@/components/ui/page-header";
import { ClaimNetworkButton } from "@/components/network/claim-network-button";
import { Globe, CalendarClock, Building2, DollarSign, Sparkles } from "lucide-react";
import { dateLabel, fmtHours, timeLabel } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AvailableNetworkShiftsPage() {
  const u = await requireUser();
  const profile = await getOrCreateWorkerProfile(u.id);
  const now = new Date();

  const offers = await prisma.networkShiftOffer.findMany({
    where: {
      status: "open",
      shift: { startsAt: { gt: now } },
      OR: [
        { invitedWorkerId: profile.id },
        ...(profile.discoverable ? [{ invitedWorkerId: null }] : []),
      ],
      postingOrgId: { not: u.organizationId },
    },
    include: {
      shift: { include: { location: true } },
      postingOrg: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Network shifts"
        icon={Globe}
        title="Cross-employer shifts"
        subtitle={profile.discoverable
          ? `${offers.length} shift${offers.length === 1 ? "" : "s"} available — claim shifts from other employers when your home schedule has gaps`
          : "Turn on discoverability in your worker profile to see open network shifts"}
      >
        <Link href="/worker/profile" className="btn-outline text-xs">Edit profile</Link>
      </PageHeader>

      {!profile.discoverable && (
        <section className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center mb-3"><Sparkles className="w-8 h-8" /></div>
          <h3 className="font-bold text-base">Opt in to the network</h3>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1 max-w-md mx-auto">
            Turn on discoverability in your <Link href="/worker/profile" className="text-brand-600 underline">worker profile</Link>. Other employers will see your reputation + skills, and you can claim cross-employer shifts.
          </p>
        </section>
      )}

      {profile.discoverable && offers.length === 0 && (
        <section className="card p-8 text-center text-sm text-ink-500 dark:text-ink-400">
          No open network shifts right now. Check back soon — new ones appear when other employers can&apos;t cover internally.
        </section>
      )}

      <ul className="space-y-2">
        {offers.map((o) => (
          <li key={o.id} className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                {o.shift.position ?? "Shift"} · {o.shift.location.name}
                <span className="badge-orange flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {o.postingOrg.name}
                </span>
                <span className="badge-gray uppercase text-[10px]">{o.payoutType}</span>
                {o.invitedWorkerId === profile.id && <span className="badge-green">Invited</span>}
              </div>
              <div className="text-[11px] text-ink-500 dark:text-ink-400">
                {dateLabel(o.shift.startsAt)} · {timeLabel(o.shift.startsAt)}–{timeLabel(o.shift.endsAt)} · {fmtHours((+o.shift.endsAt - +o.shift.startsAt) / 3600000)}
                {o.payRateOverrideCents && <> · <DollarSign className="inline w-3 h-3" /> ${(o.payRateOverrideCents / 100).toFixed(2)}/hr override</>}
              </div>
              {o.message && <div className="text-[11px] text-ink-700 dark:text-ink-300 mt-1 italic line-clamp-2">&ldquo;{o.message}&rdquo;</div>}
            </div>
            <ClaimNetworkButton offerId={o.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
