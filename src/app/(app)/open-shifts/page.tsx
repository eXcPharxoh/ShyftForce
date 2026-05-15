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
        <section className="card overflow-hidden">
          <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">All open shifts</h3>
              <p className="text-[11px] text-ink-500">Auto-offer in waves to ranked candidates.</p>
            </div>
            <span className="badge bg-amber-50 text-amber-800">{openShifts.length} open</span>
          </header>
          {openShifts.length === 0 && (
            <EmptyState
              icon={Sparkles}
              tone="success"
              title="No open shifts"
              description="Every shift this week is assigned. When you create an unassigned shift on the Schedule, it'll show up here ready to auto-offer."
              action={<Link href="/schedule" className="btn-soft">Open Schedule →</Link>}
            />
          )}
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {openShifts.map(s => (
              <ManagerOpenShiftRow
                key={s.id}
                shift={{ id: s.id, position: s.position, locationName: s.location.name, startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString() }}
                offers={s.openShiftOffers.map(o => ({
                  id: o.id, memberId: o.memberId, name: o.member.user.name, avatar: o.member.user.avatar,
                  wave: o.wave, status: o.status, expiresAt: o.expiresAt.toISOString(), respondedAt: o.respondedAt?.toISOString() ?? null,
                }))}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
