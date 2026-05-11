import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { findAvailableWorkers } from "@/lib/network/profile";
import { PageHeader } from "@/components/ui/page-header";
import { PostToNetworkButton } from "@/components/network/post-to-network-button";
import { CancelPostButton } from "@/components/network/cancel-post-button";
import { Globe, Users, CalendarClock, Star, MapPin, Sparkles } from "lucide-react";
import { dateLabel, timeLabel, initials } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ city?: string; skill?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const city = sp.city ?? null;
  const skill = sp.skill ?? null;
  const now = new Date();

  const [openShifts, postedOffers, ownMembers] = await Promise.all([
    prisma.shift.findMany({
      where: { isOpen: true, location: { organizationId: u.organizationId }, startsAt: { gt: now } },
      include: { location: true, networkShiftOffers: true },
      orderBy: { startsAt: "asc" },
      take: 50,
    }),
    prisma.networkShiftOffer.findMany({
      where: { postingOrgId: u.organizationId },
      include: {
        shift: { include: { location: true } },
        claimedBy: { include: { user: { select: { name: true, avatar: true } } } },
        invitedWorker: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.member.findMany({ where: { organizationId: u.organizationId }, select: { userId: true } }),
  ]);

  const ownUserIds = ownMembers.map((m) => m.userId);
  const rawWorkers = await findAvailableWorkers({ city, skill, excludeUserIds: ownUserIds, limit: 30 });
  const workers = rawWorkers.map((w) => ({
    ...w,
    skills: (() => { try { return w.skills ? JSON.parse(w.skills) as string[] : []; } catch { return [] as string[]; } })(),
  }));

  const unposted = openShifts.filter((s) => !s.networkShiftOffers.some((o) => o.status === "open"));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cross-employer marketplace"
        icon={Globe}
        title="Worker Network"
        subtitle={`${unposted.length} unfilled shift${unposted.length === 1 ? "" : "s"} can be posted · ${workers.length} discoverable workers in network`}
      />

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-ink-500" />
          <h3 className="text-sm font-semibold">Your open shifts (post to network)</h3>
        </header>
        {unposted.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500 dark:text-ink-400">
            No unfilled shifts to post. Open shifts on your <Link href="/schedule" className="text-brand-600">schedule</Link> appear here.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {unposted.map((s) => (
              <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center"><CalendarClock className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{s.position ?? "Shift"} · {s.location.name}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">{dateLabel(s.startsAt)} · {timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}</div>
                </div>
                <PostToNetworkButton shiftId={s.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {postedOffers.length > 0 && (
        <section className="card overflow-hidden">
          <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-semibold">Your network posts</h3>
          </header>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {postedOffers.map((o) => (
              <li key={o.id} className="px-5 py-3 flex items-center gap-3">
                <StatusBadge status={o.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{o.shift.position ?? "Shift"} · {o.shift.location.name}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">
                    {dateLabel(o.shift.startsAt)} · {timeLabel(o.shift.startsAt)}–{timeLabel(o.shift.endsAt)} · {o.payoutType.toUpperCase()}
                    {o.invitedWorker && <> · invited <span className="text-ink-700 dark:text-ink-300">{o.invitedWorker.user.name}</span></>}
                  </div>
                  {o.claimedBy && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      ✓ Claimed by {o.claimedBy.user.name} · {new Date(o.claimedAt!).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  )}
                </div>
                {o.status === "open" && <CancelPostButton offerId={o.id} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-ink-500" />
          <h3 className="text-sm font-semibold">Discoverable workers</h3>
          <form className="ml-auto flex items-center gap-1.5 text-xs">
            <input name="city" defaultValue={city ?? ""} placeholder="City" className="input h-7 text-xs w-24" />
            <input name="skill" defaultValue={skill ?? ""} placeholder="Skill" className="input h-7 text-xs w-24" />
            <button className="btn-outline text-xs">Filter</button>
          </form>
        </header>
        {workers.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500 dark:text-ink-400">
            No discoverable workers yet — the network grows as more workers opt in.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {workers.map((w) => (
              <li key={w.id} className="px-5 py-3 flex items-center gap-3">
                {w.user.avatar
                  ? <img src={w.user.avatar} className="w-10 h-10 rounded-full" alt="" />
                  : <div className="w-10 h-10 rounded-full bg-ink-200 dark:bg-ink-800 text-sm font-semibold flex items-center justify-center">{initials(w.user.name)}</div>}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {w.user.name}
                    {w.reputationScore != null && (
                      <span className="badge-gray flex items-center gap-1">
                        <Star className="w-3 h-3" /> {w.reputationScore.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400 flex items-center gap-1.5 flex-wrap">
                    {w.city && <><MapPin className="w-3 h-3" /> {w.city}{w.stateRegion ? `, ${w.stateRegion}` : ""}</>}
                    {w.totalShiftsCompleted > 0 && <span>· {w.totalShiftsCompleted} shifts</span>}
                    {w.totalEmployers > 0 && <span>· {w.totalEmployers} employers</span>}
                  </div>
                  {w.bio && <div className="text-[11px] text-ink-700 dark:text-ink-300 mt-0.5 line-clamp-2">{w.bio}</div>}
                  {w.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {w.skills.slice(0, 6).map((s: string) => <span key={s} className="badge-gray text-[10px]">{s}</span>)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "claimed") return <span className="badge-green flex items-center gap-1"><Sparkles className="w-3 h-3" /> Claimed</span>;
  if (status === "open") return <span className="badge-amber">Open</span>;
  if (status === "canceled") return <span className="badge-gray">Canceled</span>;
  if (status === "filled_internally") return <span className="badge-gray">Filled internally</span>;
  return <span className="badge-gray">{status}</span>;
}
