import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, fmtHours, initials, relTime, startOfWeek, timeLabel } from "@/lib/utils";
import { ClaimButton } from "@/components/marketplace/claim-button";
import { ManagerOpenShiftRow } from "@/components/marketplace/manager-open-shift-row";
import { CantMakeItButton } from "@/components/marketplace/cant-make-it-button";
import { CalendarClock, ShoppingBag, Users, AlertTriangle, Sparkles, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

export default async function OpenShiftsPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const now = new Date();
  const weekHorizon = addDays(now, 14);

  // All open shifts in the org going forward
  const openShifts = await prisma.shift.findMany({
    where: { isOpen: true, location: { organizationId: u.organizationId }, startsAt: { gte: now } },
    include: {
      location: true,
      openShiftOffers: { include: { member: { include: { user: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  // Pending offers for this user
  const myOffers = await prisma.openShiftOffer.findMany({
    where: { memberId: u.memberId, status: "pending", expiresAt: { gt: now } },
    include: {
      shift: { include: { location: true } },
    },
    orderBy: { expiresAt: "asc" },
  });

  // The employee's own upcoming shifts — so they can release one if they can't make it
  const myUpcoming = await prisma.shift.findMany({
    where: {
      memberId: u.memberId,
      isOpen: false,
      startsAt: { gte: now, lte: weekHorizon },
    },
    include: { location: true },
    orderBy: { startsAt: "asc" },
    take: 6,
  });

  // Also any open shifts at my location that I'm not yet offered (browse)
  const browsable = openShifts.filter(s => !s.openShiftOffers.some(o => o.memberId === u.memberId));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Marketplace"
        icon={ShoppingBag}
        title="Open shifts"
        subtitle={`${openShifts.length} open shift${openShifts.length === 1 ? "" : "s"} · ${myOffers.length} ${myOffers.length === 1 ? "offer waiting for you" : "offers waiting for you"}`}
      >
        {isManager && (
          <Link href="/schedule/coverage" className="btn-outline text-xs">
            <ShieldAlert className="w-4 h-4" /> Coverage Center
          </Link>
        )}
      </PageHeader>

      {!isManager && myUpcoming.length > 0 && (
        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-ink-500" /> Your upcoming shifts ({myUpcoming.length})
          </h3>
          <ul className="space-y-2">
            {myUpcoming.map(s => (
              <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center"><CalendarClock className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{s.position ?? "Shift"} · {s.location.name}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">{dateLabel(s.startsAt)} · {timeLabel(s.startsAt)} – {timeLabel(s.endsAt)} · {fmtHours((+s.endsAt - +s.startsAt)/3600000)}</div>
                </div>
                <CantMakeItButton shiftId={s.id} />
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-500 mt-2">If you can&apos;t make a shift, release it here — autopilot will DM the top 3 candidates and your manager will be notified.</p>
        </section>
      )}

      {!isManager && myOffers.length > 0 && (
        <section className="card p-4 border-brand-200 bg-gradient-to-br from-brand-50 to-rose-50">
          <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3 text-brand-900">
            <CalendarClock className="w-4 h-4" /> Offered to you ({myOffers.length})
          </h3>
          <ul className="space-y-2">
            {myOffers.map(o => {
              const minutesLeft = Math.max(0, Math.floor((+o.expiresAt - +now) / 60000));
              return (
                <li key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-brand-200">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center"><CalendarClock className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{o.shift.position ?? "Shift"} · {o.shift.location.name}</div>
                    <div className="text-[11px] text-ink-500">{dateLabel(o.shift.startsAt)} · {timeLabel(o.shift.startsAt)} – {timeLabel(o.shift.endsAt)}</div>
                    {o.rationale && <div className="text-[11px] text-brand-700 mt-0.5">Why you: {o.rationale}</div>}
                  </div>
                  <div className="text-right shrink-0 mr-2">
                    <div className="text-[11px] text-ink-500">Wave {o.wave}</div>
                    <div className={`text-xs font-semibold ${minutesLeft < 15 ? "text-rose-600" : "text-ink-700 dark:text-ink-300"}`}>
                      {minutesLeft < 60 ? `${minutesLeft}m left` : `${Math.floor(minutesLeft/60)}h ${minutesLeft%60}m left`}
                    </div>
                  </div>
                  <ClaimButton shiftId={o.shift.id} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!isManager && (
        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Available to claim</h3>
          {browsable.length === 0 && (
            <EmptyState
              icon={Sparkles}
              tone="success"
              title="All caught up — no open shifts"
              description="When your manager opens a shift to the team, you'll see it here. We'll also DM you for any offer made directly to you."
            />
          )}
          <ul className="space-y-2">
            {browsable.map(s => (
              <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800 hover:border-brand-300">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><ShoppingBag className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{s.position ?? "Shift"} · {s.location.name}</div>
                  <div className="text-[11px] text-ink-500">{dateLabel(s.startsAt)} · {timeLabel(s.startsAt)} – {timeLabel(s.endsAt)} · {fmtHours((+s.endsAt - +s.startsAt)/3600000)}</div>
                </div>
                <ClaimButton shiftId={s.id} variant="secondary" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {isManager && (
        <section>
          {/* Tab strip — using the new .segmented utility for a modern
              tab feel. Only one tab is currently interactive (no real
              "in progress" or "filled" routes yet); the others are read-
              only labels with built-in muted styling. */}
          <div className="flex items-center gap-3 mb-3">
            <div className="segmented">
              <span className="seg seg-active">Open · {openShifts.length}</span>
              <span className="seg">In progress · {openShifts.filter(s => s.openShiftOffers.some(o => o.status === "pending")).length}</span>
              <span className="seg opacity-60">Filled · —</span>
            </div>
          </div>

          {openShifts.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              tone="success"
              title="No open shifts"
              description="Every shift this week is assigned. When you create an unassigned shift on the Schedule, it'll show up here ready to auto-offer."
              action={<Link href="/schedule" className="btn-soft">Open Schedule →</Link>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {openShifts.map(s => {
                const offered    = s.openShiftOffers.length;
                const claimed    = s.openShiftOffers.filter(o => o.status === "claimed").length;
                const pending    = s.openShiftOffers.filter(o => o.status === "pending").length;
                const superseded = s.openShiftOffers.filter(o => o.status === "superseded").length;
                const wave       = Math.max(0, ...s.openShiftOffers.map(o => o.wave));
                return (
                  <div key={s.id} className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-brand-500">
                          {wave > 0 ? `Wave ${wave}` : "Not yet offered"}
                          {pending > 0 && ` · ${pending} pending`}
                        </div>
                        <h3 className="text-[15px] font-semibold mt-1">{s.position ?? "Open shift"}</h3>
                        <div className="text-[12px] text-ink-300 mt-0.5">
                          {s.location.name} · {dateLabel(s.startsAt)}
                        </div>
                        <div className="text-[11px] text-ink-500 font-mono">
                          {timeLabel(s.startsAt)} – {timeLabel(s.endsAt)} · {fmtHours((+s.endsAt - +s.startsAt) / 3600_000)}
                        </div>
                      </div>
                      <span className={`status ${
                        claimed > 0 ? "status-success" :
                        pending > 0 ? "status-info"    :
                                      "status-warn"
                      }`}>
                        {claimed > 0 ? "Claimed" : pending > 0 ? "In progress" : "Open"}
                      </span>
                    </div>

                    {/* Stacked offered-to avatars */}
                    {offered > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex -space-x-2">
                          {s.openShiftOffers.slice(0, 5).map((o, i) => (
                            <div
                              key={o.id}
                              className="w-7 h-7 rounded-full text-[10px] font-semibold text-white flex items-center justify-center ring-2 ring-ink-900 shrink-0"
                              style={{
                                background: "linear-gradient(135deg, #6aa2ff, #3a6fd8)",
                                zIndex: 10 - i,
                              }}
                              title={o.member.user.name}
                            >
                              {initials(o.member.user.name)}
                            </div>
                          ))}
                          {offered > 5 && (
                            <div className="w-7 h-7 rounded-full text-[10px] font-semibold text-ink-300 flex items-center justify-center ring-2 ring-ink-900 bg-white/[0.06]">
                              +{offered - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-ink-500">
                          Offered to {offered} · {superseded > 0 ? `${superseded} superseded` : "all live"}
                        </span>
                      </div>
                    )}

                    {/* Inline ManagerOpenShiftRow gives us the action buttons */}
                    <ManagerOpenShiftRow
                      shift={{ id: s.id, position: s.position, locationName: s.location.name, startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString() }}
                      offers={s.openShiftOffers.map(o => ({
                        id: o.id, memberId: o.memberId, name: o.member.user.name, avatar: o.member.user.avatar,
                        wave: o.wave, status: o.status, expiresAt: o.expiresAt.toISOString(), respondedAt: o.respondedAt?.toISOString() ?? null,
                      }))}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
