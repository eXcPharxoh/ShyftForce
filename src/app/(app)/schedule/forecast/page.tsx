import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, startOfWeek } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { RegenerateButton } from "@/components/forecast/regenerate-button";
import { ApplyButton } from "@/components/forecast/apply-button";
import { ContextForm } from "@/components/forecast/context-form";
import { LocationSelect } from "@/components/forecast/location-select";
import { TrendingUp, MapPin, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ForecastPage({ searchParams }: { searchParams: Promise<{ location?: string; w?: string }> }) {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const sp = await searchParams;

  const locations = await prisma.location.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { name: "asc" },
  });
  const locationId = sp.location || locations[0]?.id;
  if (!locationId) {
    return (
      <div className="card p-12 text-center">
        <h3 className="font-bold">No locations yet</h3>
        <p className="text-sm text-ink-500 mt-1">Add a location first to see demand forecasts.</p>
      </div>
    );
  }

  const weekOffset = parseInt(sp.w ?? "0", 10);
  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const weekEnd = addDays(weekStart, 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [slots, contextItems, location, draftCount] = await Promise.all([
    prisma.demandForecast.findMany({
      where: { locationId, slotStart: { gte: weekStart, lt: weekEnd } },
      orderBy: { slotStart: "asc" },
    }),
    prisma.demandContext.findMany({
      where: {
        organizationId: u.organizationId,
        OR: [{ locationId }, { locationId: null }],
        endsAt: { gt: weekStart },
        startsAt: { lt: weekEnd },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.location.findFirst({ where: { id: locationId, organizationId: u.organizationId } }),
    prisma.shift.count({
      where: { locationId, status: "draft", startsAt: { gte: weekStart, lt: weekEnd } },
    }),
  ]);

  const totalRev = slots.reduce((a, s) => a + s.predictedRevenueCents, 0);
  const totalHrs = slots.reduce((a, s) => a + s.predictedHeadcount * 0.5, 0);
  const peakHc   = slots.length > 0 ? Math.max(...slots.map((s) => s.predictedHeadcount)) : 0;

  // Build per-day grid (rows = days, cols = 30-min slots from 6am-midnight = 36 cols)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const slotsByKey = new Map<string, typeof slots[number]>();
  for (const s of slots) slotsByKey.set(`${isoDate(s.slotStart)}|${slotIdx(s.slotStart)}`, s);
  const gridStartHour = 6;
  const gridEndHour = 24;
  const colCount = (gridEndHour - gridStartHour) * 2;

  const maxSlotRevenue = slots.length > 0 ? Math.max(...slots.map((s) => s.predictedRevenueCents), 1) : 1;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Predictive demand"
        icon={TrendingUp}
        title="Auto-Schedule Forecast"
        subtitle={`${location?.name ?? "—"} · ${dateLabel(weekStart)} → ${dateLabel(addDays(weekEnd, -1))} · ${slots.length > 0 ? `${slots.length} slots forecasted` : "no forecast yet — regenerate to start"}`}
      >
        {locations.length > 1 && (
          <LocationSelect current={locationId} locations={locations.map(l => ({ id: l.id, name: l.name }))} weekParam={String(weekOffset)} />
        )}
        <Link href={`/schedule/forecast?w=${weekOffset - 1}&location=${locationId}`} className="btn-outline h-9"><ChevronLeft className="w-4 h-4" /></Link>
        <Link href={`/schedule/forecast?location=${locationId}`} className="btn-outline h-9 text-xs">This week</Link>
        <Link href={`/schedule/forecast?w=${weekOffset + 1}&location=${locationId}`} className="btn-outline h-9"><ChevronRight className="w-4 h-4" /></Link>
        {isManager && <RegenerateButton locationId={locationId} weekStart={weekStartStr} />}
        {isManager && slots.length > 0 && <ApplyButton locationId={locationId} weekStart={weekStartStr} />}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Predicted revenue" value={`$${(totalRev / 100).toFixed(0)}`} tone="emerald" />
        <Stat label="Predicted hours"   value={`${totalHrs.toFixed(0)}h`} tone="brand" />
        <Stat label="Peak headcount"    value={peakHc} tone="amber" />
        <Stat label="Existing drafts"   value={draftCount} tone="ink" />
      </div>

      {slots.length === 0 ? (
        <section className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center mb-3"><Sparkles className="w-8 h-8" /></div>
          <h3 className="font-bold text-base">No forecast for this week yet</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">
            Click <span className="font-semibold">Regenerate forecast</span> to build a per-30min revenue + staffing prediction from POS history (last 8 weeks) and any context events you&apos;ve added.
          </p>
        </section>
      ) : (
        <section className="card overflow-x-auto">
          <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-ink-500" />
            <h3 className="text-sm font-semibold">Predicted demand heatmap</h3>
            <span className="text-[11px] text-ink-500 dark:text-ink-400 ml-auto">Each cell shows predicted $ + headcount; darker = higher</span>
          </header>
          <div className="p-3 min-w-[900px]">
            <div className="flex items-center text-[10px] text-ink-500 mb-1.5 pl-16">
              {Array.from({ length: (gridEndHour - gridStartHour) }, (_, h) => gridStartHour + h).map((hour) => (
                <div key={hour} className="flex-1 text-center font-mono">{hour}</div>
              ))}
            </div>
            <div className="space-y-1">
              {days.map((day) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={+day} className="flex items-center gap-1.5">
                    <div className={`w-14 text-[11px] font-semibold shrink-0 ${isToday ? "text-brand-600 dark:text-brand-400" : "text-ink-700 dark:text-ink-300"}`}>
                      {day.toLocaleDateString("en-US", { weekday: "short" })} {day.getDate()}
                    </div>
                    <div className="flex-1 grid gap-px" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
                      {Array.from({ length: colCount }, (_, i) => {
                        const slotI = (gridStartHour * 2) + i;
                        const k = `${isoDate(day)}|${slotI}`;
                        const s = slotsByKey.get(k);
                        if (!s) return <div key={i} className="h-7 rounded bg-ink-100 dark:bg-ink-800/60" title="no data" />;
                        const intensity = s.predictedRevenueCents / maxSlotRevenue;
                        const headcount = s.predictedHeadcount;
                        return (
                          <div
                            key={i}
                            className="h-7 rounded relative group cursor-default"
                            style={{
                              backgroundColor: headcount === 0 ? "rgba(148, 163, 184, 0.15)" : `rgba(244, 114, 182, ${0.1 + intensity * 0.85})`,
                            }}
                            title={`${s.slotStart.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · $${(s.predictedRevenueCents/100).toFixed(0)} · ${headcount} staff${s.contextNotes ? " · " + s.contextNotes : ""}`}
                          >
                            {headcount > 0 && (
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
                                {headcount}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {isManager && (
        <section className="card p-5">
          <ContextForm
            locationId={locationId}
            items={contextItems.map((c) => ({
              id: c.id,
              locationId: c.locationId,
              startsAt: c.startsAt.toISOString(),
              endsAt: c.endsAt.toISOString(),
              category: c.category,
              label: c.label,
              expectedImpactPct: c.expectedImpactPct,
            }))}
          />
          <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-3">
            Add holidays, local events, promotions, weather expectations. The forecaster multiplies predicted demand by the context impact for slots that overlap.
          </p>
        </section>
      )}
    </div>
  );
}

function isoDate(d: Date): string { const x = new Date(d); x.setHours(0,0,0,0); return x.toISOString().slice(0,10); }
function slotIdx(d: Date): number { return d.getHours() * 2 + (d.getMinutes() >= 30 ? 1 : 0); }

function Stat({ label, value, tone }: { label: string; value: string | number; tone: "ink" | "brand" | "amber" | "emerald" }) {
  const colors: Record<string, string> = {
    ink: "text-ink-900 dark:text-ink-50",
    brand: "text-brand-700 dark:text-brand-300",
    amber: "text-amber-700 dark:text-amber-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 dark:text-ink-400 font-semibold tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 tracking-tight-2 ${colors[tone]}`}>{value}</div>
    </div>
  );
}
