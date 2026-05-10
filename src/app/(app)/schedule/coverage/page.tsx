import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { detectNoShows } from "@/lib/marketplace/autopilot";
import { dateLabel, fmtHours, initials, timeLabel } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TickButton } from "@/components/marketplace/tick-button";
import { FindCoverButton } from "@/components/marketplace/find-cover-button";
import { ShieldAlert, CalendarClock, Clock, Wand2, AlertOctagon, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const now = new Date();
  const horizon = new Date(now.getTime() + 48 * 3600_000);

  const [openShifts, noShows] = await Promise.all([
    prisma.shift.findMany({
      where: {
        isOpen: true,
        memberId: null,
        startsAt: { gte: now, lte: horizon },
        location: { organizationId: u.organizationId },
      },
      include: {
        location: true,
        openShiftOffers: { include: { member: { include: { user: true } } } },
      },
      orderBy: { startsAt: "asc" },
    }),
    detectNoShows({ organizationId: u.organizationId, now }),
  ]);

  const stats = {
    open: openShifts.length,
    pending: openShifts.reduce((a, s) => a + s.openShiftOffers.filter((o) => o.status === "pending").length, 0),
    awaitingFirstOffer: openShifts.filter((s) => s.openShiftOffers.length === 0).length,
    noShows: noShows.length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Self-healing schedule"
        icon={ShieldAlert}
        title="Coverage Center"
        subtitle={`Live view of every uncovered shift in the next 48h · ${stats.open} open · ${stats.pending} offers in flight · ${stats.noShows} suspected no-show${stats.noShows === 1 ? "" : "s"}`}
      >
        {isManager && <TickButton />}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Open shifts (48h)" value={stats.open} tone="amber" />
        <Stat label="Offers in flight" value={stats.pending} tone="blue" />
        <Stat label="Awaiting first offer" value={stats.awaitingFirstOffer} tone="rose" />
        <Stat label="Suspected no-shows" value={stats.noShows} tone="red" />
      </div>

      {isManager && noShows.length > 0 && (
        <section className="card overflow-hidden border-rose-200 dark:border-rose-500/30">
          <header className="px-5 py-3 border-b border-rose-100 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-500/10 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-300" />
            <div>
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Suspected no-shows</h3>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">Shift started 15+ minutes ago without a clock-in. Confirm to release the shift and trigger autopilot cover.</p>
            </div>
          </header>
          <ul className="divide-y divide-rose-100 dark:divide-rose-500/20">
            {noShows.map((n) => (
              <li key={n.shiftId} className="px-5 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink-900 dark:text-ink-100">{n.memberName} · {n.locationName}</div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-300">
                    Was due at {timeLabel(n.startsAt)} · {n.minutesLate}min late · ends {timeLabel(n.endsAt)}
                  </div>
                </div>
                <FindCoverButton shiftId={n.shiftId} size="md" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-ink-500 dark:text-ink-400" />
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Shifts the autopilot is covering</h3>
          </div>
          <span className="text-[11px] text-ink-500 dark:text-ink-400">Next 48 hours</span>
        </header>

        {openShifts.length === 0 && (
          <EmptyState
            icon={Sparkles}
            tone="success"
            title="Every shift in the next 48h has a person on it"
            description="When someone calls out or a shift opens, you'll see live autopilot progress here — wave-by-wave, with who's been DM'd and what they said."
          />
        )}

        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {openShifts.map((s) => {
            const offers = s.openShiftOffers;
            const lastWave = offers.reduce((a, o) => Math.max(a, o.wave), 0);
            const pendingCount = offers.filter((o) => o.status === "pending").length;
            const declinedCount = offers.filter((o) => o.status === "declined").length;
            const expiredCount = offers.filter((o) => o.status === "expired").length;
            const minutesToStart = Math.floor((+s.startsAt - +now) / 60_000);
            const urgency = minutesToStart < 60 ? "rose" : minutesToStart < 240 ? "amber" : "ink";
            return (
              <li key={s.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    urgency === "rose" ? "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    : urgency === "amber" ? "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300"
                  }`}>
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink-900 dark:text-ink-100 truncate">
                      {s.position ?? "Shift"} · {s.location.name}
                    </div>
                    <div className="text-[11px] text-ink-500 dark:text-ink-400">
                      {dateLabel(s.startsAt)} · {timeLabel(s.startsAt)} – {timeLabel(s.endsAt)} · {fmtHours((+s.endsAt - +s.startsAt) / 3600000)}
                      {minutesToStart >= 0 && (
                        <span className={`ml-2 font-semibold ${
                          urgency === "rose" ? "text-rose-600 dark:text-rose-300"
                          : urgency === "amber" ? "text-amber-700 dark:text-amber-300"
                          : "text-ink-600 dark:text-ink-400"
                        }`}>
                          starts in {minutesToStart < 60 ? `${minutesToStart}m` : `${Math.floor(minutesToStart / 60)}h ${minutesToStart % 60}m`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[11px] mr-2">
                    {lastWave === 0 ? (
                      <span className="text-amber-700 dark:text-amber-300 font-semibold">No offers sent yet</span>
                    ) : (
                      <>
                        <div className="font-semibold text-ink-700 dark:text-ink-300">Wave {lastWave} of 3</div>
                        <div className="text-ink-500 dark:text-ink-400">{pendingCount} pending · {declinedCount} declined · {expiredCount} expired</div>
                      </>
                    )}
                  </div>
                  {isManager && lastWave === 0 && <FindCoverButton shiftId={s.id} size="md" />}
                </div>

                {offers.length > 0 && (
                  <ul className="mt-2 ml-13 pl-13 space-y-1 text-xs">
                    {offers
                      .slice()
                      .sort((a, b) => a.wave - b.wave || a.member.user.name.localeCompare(b.member.user.name))
                      .map((o) => (
                        <li key={o.id} className="flex items-center gap-2 px-1">
                          <span className="badge-gray">W{o.wave}</span>
                          <div className="w-5 h-5 rounded-full bg-ink-200 dark:bg-ink-800 text-[9px] font-semibold flex items-center justify-center text-ink-700 dark:text-ink-300">
                            {initials(o.member.user.name)}
                          </div>
                          <span className="text-ink-700 dark:text-ink-300">{o.member.user.name}</span>
                          <span className="text-ink-400 dark:text-ink-500">·</span>
                          <StatusBadge status={o.status} />
                          {o.status === "pending" && (
                            <span className="text-ink-500 dark:text-ink-400">
                              expires {new Date(o.expiresAt).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "rose" | "red" }) {
  const colors: Record<string, string> = {
    amber: "text-amber-700 dark:text-amber-300",
    blue: "text-brand-700 dark:text-brand-300",
    rose: "text-rose-700 dark:text-rose-300",
    red: "text-rose-700 dark:text-rose-300",
  };
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 tracking-tight-2 ${colors[tone]}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "claimed") return <span className="badge-green">Claimed</span>;
  if (status === "pending") return <span className="badge-amber">Pending</span>;
  if (status === "declined") return <span className="badge-red">Declined</span>;
  if (status === "expired") return <span className="badge-gray">Expired</span>;
  if (status === "superseded") return <span className="badge-gray">Superseded</span>;
  return <span className="badge-gray">{status}</span>;
}
