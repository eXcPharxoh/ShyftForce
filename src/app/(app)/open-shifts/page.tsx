import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel, fmtHours, initials, relTime, timeLabel } from "@/lib/utils";
import { ClaimButton } from "@/components/marketplace/claim-button";
import { ManagerOpenShiftRow } from "@/components/marketplace/manager-open-shift-row";
import { CalendarClock, ShoppingBag, Users, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default async function OpenShiftsPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const now = new Date();

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

  // Also any open shifts at my location that I'm not yet offered (browse)
  const browsable = openShifts.filter(s => !s.openShiftOffers.some(o => o.memberId === u.memberId));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Marketplace"
        icon={ShoppingBag}
        title="Open shifts"
        subtitle={`${openShifts.length} open shift${openShifts.length === 1 ? "" : "s"} · ${myOffers.length} ${myOffers.length === 1 ? "offer waiting for you" : "offers waiting for you"}`}
      />

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
                    <div className={`text-xs font-semibold ${minutesLeft < 15 ? "text-rose-600" : "text-ink-700"}`}>
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
          {browsable.length === 0 && <div className="text-xs text-ink-500 py-3 text-center">No browsable open shifts right now.</div>}
          <ul className="space-y-2">
            {browsable.map(s => (
              <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 hover:border-brand-300">
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
          <header className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">All open shifts</h3>
              <p className="text-[11px] text-ink-500">Auto-offer in waves to ranked candidates.</p>
            </div>
            <span className="badge bg-amber-50 text-amber-800">{openShifts.length} open</span>
          </header>
          {openShifts.length === 0 && (
            <div className="p-12 text-center text-sm text-ink-500">No open shifts. ✨</div>
          )}
          <ul className="divide-y divide-ink-100">
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
