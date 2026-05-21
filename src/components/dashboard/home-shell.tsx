"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bolt } from "@/components/ui/logo";
import {
  Clock, ShoppingBag, Users, ShieldCheck, Sparkles, ArrowRight,
  TrendingUp, AlertTriangle,
} from "lucide-react";

/**
 * Home dashboard — recreated from design_handoff_shyftforce.
 *
 * Layout per spec:
 *   - "Good morning, {name}" greeting
 *   - 4 KPI cards (Labor cost today / Open shifts / Live clock-ins / Compliance)
 *   - Today's roster timeline (10am-midnight, vertical red current-time line)
 *   - Live activity feed
 *   - Co-pilot suggestions card (3 actionable insights w/ primary buttons)
 *   - Demand forecast 7-day bars with Fri/Sat hot callout
 *   - This week stats
 *
 * Server-fetched data is passed in via props; the component itself is client-
 * side so we can tick the current-time line each minute without re-rendering
 * the whole page.
 */

export type RosterEntry = {
  id: string;
  memberId: string;
  name: string;
  initials: string;
  color: string;
  position: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  status: "scheduled" | "in" | "break" | "out";
};

export type ActivityEntry = {
  id: string;
  kind: "clock_in" | "clock_out" | "claim" | "swap_request" | "copilot" | "approval";
  message: string;
  at: string; // ISO
};

export type CopilotSuggestion = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export function HomeShell({
  greeting, name,
  kpis,
  roster,
  activity: initialActivity,
  suggestions,
  demand,
  weekStats,
}: {
  greeting: string;
  name: string;
  kpis: { labor: string; laborDelta?: string; openShifts: number; clockedIn: number; compliancePct: number };
  roster: RosterEntry[];
  activity: ActivityEntry[];
  suggestions: CopilotSuggestion[];
  demand: { dayLabel: string; predicted: number; isHot?: boolean }[];
  weekStats: { hours: number; shifts: number; cost: string; ot: number };
}) {
  // Tick the current time line every 30s
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Real-time activity polling — refresh every 15s without reloading.
  // Replaces the server-rendered prop with the latest payload from
  // /api/dashboard/activity. Survives network blips silently.
  const [activity, setActivity] = useState(initialActivity);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/dashboard/activity", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.activity)) setActivity(data.activity);
      } catch { /* ignore */ }
    };
    const t = setInterval(poll, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div className="space-y-5 max-w-[1480px]">
      {/* Greeting */}
      <header>
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500 mb-1">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 className="h-page">{greeting}, {name.split(" ")[0]}</h1>
        <p className="text-[14px] text-ink-300 mt-0.5">Here's what's happening across your team today.</p>
      </header>

      {/* 4 KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Labor cost today"
          value={kpis.labor}
          sub={kpis.laborDelta ?? "vs last week"}
          icon={TrendingUp}
          tone="info"
        />
        <Kpi
          label="Open shifts"
          value={String(kpis.openShifts)}
          sub={kpis.openShifts === 0 ? "All covered" : "Awaiting claim"}
          icon={ShoppingBag}
          tone={kpis.openShifts > 5 ? "warn" : kpis.openShifts > 0 ? "info" : "success"}
        />
        <Kpi
          label="Live clock-ins"
          value={String(kpis.clockedIn)}
          sub="On the clock right now"
          icon={Clock}
          tone="success"
        />
        <Kpi
          label="Compliance"
          value={`${kpis.compliancePct}%`}
          sub={kpis.compliancePct >= 95 ? "All rules passing" : "Review violations"}
          icon={ShieldCheck}
          tone={kpis.compliancePct >= 95 ? "success" : kpis.compliancePct >= 80 ? "warn" : "danger"}
        />
      </section>

      {/* Timeline + Co-pilot suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <TodayRoster roster={roster} now={now} />
        <CopilotSuggestionsCard suggestions={suggestions} />
      </div>

      {/* Activity + Demand forecast + Week stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ActivityFeed activity={activity} />
        <DemandForecast demand={demand} />
        <WeekStats weekStats={weekStats} />
      </div>
    </div>
  );
}

/* ============================================================================
   KPI CARD
   ============================================================================ */

function Kpi({ label, value, sub, icon: Icon, tone }: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  tone: "success" | "warn" | "danger" | "info";
}) {
  const toneClass: Record<typeof tone, string> = {
    success: "text-success bg-success/10",
    warn:    "text-warn    bg-warn/10",
    danger:  "text-danger  bg-danger/10",
    info:    "text-brand-300 bg-brand-500/10",
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-500">{label}</div>
          <div className="font-display text-[32px] font-medium leading-none mt-2 grad-text-accent tabular-nums">{value}</div>
          <div className="text-[12px] text-ink-300 mt-1.5">{sub}</div>
        </div>
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${toneClass[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   TODAY ROSTER TIMELINE (10am → midnight, red current-time line)
   ============================================================================ */

function TodayRoster({ roster, now }: { roster: RosterEntry[]; now: Date }) {
  // Hours shown: 10am → midnight (14h span, 10..23)
  const START_HOUR = 10;
  const END_HOUR = 24;
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayStartMin = START_HOUR * 60;
  const dayEndMin = END_HOUR * 60;
  const showRedLine = currentMinutes >= dayStartMin && currentMinutes <= dayEndMin;
  const redLineLeftPct = ((currentMinutes - dayStartMin) / (dayEndMin - dayStartMin)) * 100;

  function shiftBarStyle(startsAt: string, endsAt: string) {
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    const sm = s.getHours() * 60 + s.getMinutes();
    const em = e.getHours() * 60 + e.getMinutes();
    const left = Math.max(0, ((sm - dayStartMin) / (dayEndMin - dayStartMin)) * 100);
    const width = Math.min(100, ((em - sm) / (dayEndMin - dayStartMin)) * 100);
    return { left: `${left}%`, width: `${width}%` };
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold">Today's roster</h3>
          <p className="text-[11px] text-ink-500 mt-0.5">10am to midnight</p>
        </div>
        <Link href="/schedule" className="btn-ghost btn-sm">
          Open schedule <ArrowRight className="w-3 h-3 arrow" />
        </Link>
      </div>

      <div className="space-y-2 relative">
        {/* Hour labels */}
        <div className="flex text-[10px] font-mono text-ink-500 -mb-1 pl-[140px] pr-2">
          {hours.filter(h => (h - START_HOUR) % 2 === 0).map(h => {
            const left = ((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
            return (
              <span key={h} className="absolute" style={{ left: `calc(140px + ${left}%)`, top: 0 }}>
                {h % 12 === 0 ? 12 : h % 12}{h < 12 ? "a" : "p"}
              </span>
            );
          })}
        </div>

        {/* Rows */}
        <div className="pt-4">
          {roster.length === 0 ? (
            <p className="text-[12px] text-ink-500 text-center py-8">No shifts scheduled for today.</p>
          ) : (
            <div className="space-y-1.5 relative">
              {/* Red current-time line — spans all rows */}
              {showRedLine && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-rose-500 z-10 pointer-events-none"
                  style={{ left: `calc(140px + ${redLineLeftPct}%)`, boxShadow: "0 0 8px rgba(241,122,142,0.6)" }}
                >
                  <div className="absolute -top-2 -left-1 w-2 h-2 rounded-full bg-rose-500" />
                </div>
              )}

              {roster.slice(0, 8).map(r => (
                <div key={r.id} className="flex items-center gap-2 h-8">
                  <div className="w-[140px] flex items-center gap-2 shrink-0 pr-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                      style={{ background: `linear-gradient(135deg, ${r.color}, color-mix(in srgb, ${r.color} 40%, #000))` }}
                    >
                      {r.initials}
                    </div>
                    <div className="text-[12px] text-ink-50 truncate">{r.name.split(" ")[0]}</div>
                  </div>
                  <div className="flex-1 relative h-6 rounded-md bg-white/[0.02] border border-white/[0.04]">
                    <div
                      className="absolute top-0 bottom-0 rounded-md flex items-center px-2 text-[10px] text-white font-medium overflow-hidden"
                      style={{
                        ...shiftBarStyle(r.startsAt, r.endsAt),
                        background: `linear-gradient(90deg, color-mix(in srgb, ${r.color} 70%, transparent), color-mix(in srgb, ${r.color} 40%, transparent))`,
                        border: `1px solid color-mix(in srgb, ${r.color} 50%, transparent)`,
                      }}
                    >
                      <span className="truncate">{r.position}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   CO-PILOT SUGGESTIONS — gradient bg + accent border
   ============================================================================ */

function CopilotSuggestionsCard({ suggestions }: { suggestions: CopilotSuggestion[] }) {
  return (
    <div
      className="rounded-md p-5 border border-brand-500/30 shadow-glow relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(106,162,255,0.06) 0%, rgba(13,20,34,0.95) 60%)",
      }}
    >
      {/* Glow halo */}
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(106,162,255,0.25), transparent 70%)", filter: "blur(20px)" }} />

      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Bolt size={16} />
          <h3 className="text-[15px] font-semibold">Co-pilot suggests</h3>
        </div>
        <p className="text-[11px] text-ink-500 mb-4 font-mono uppercase tracking-[0.12em]">3 things to look at today</p>

        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-[12px] text-ink-500">All caught up — nothing needs attention.</p>
          ) : (
            suggestions.slice(0, 3).map(s => (
              <div key={s.id} className="p-3 rounded-md bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[13px] font-semibold text-ink-50">{s.title}</div>
                <p className="text-[12px] text-ink-300 mt-0.5 leading-snug">{s.body}</p>
                <Link href={s.ctaHref} className="btn-primary btn-sm mt-3 text-[11px]">
                  {s.ctaLabel} <ArrowRight className="w-3 h-3 arrow" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ACTIVITY FEED
   ============================================================================ */

function ActivityFeed({ activity }: { activity: ActivityEntry[] }) {
  const iconFor: Record<ActivityEntry["kind"], { ch: string; tone: string }> = {
    clock_in:     { ch: "✓", tone: "text-success" },
    clock_out:    { ch: "○", tone: "text-ink-500" },
    claim:        { ch: "⚡", tone: "text-brand-300" },
    swap_request: { ch: "⇄", tone: "text-warn" },
    copilot:      { ch: "✦", tone: "text-brand-300" },
    approval:     { ch: "✓", tone: "text-success" },
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold">Live activity</h3>
        <span className="status status-success">Live</span>
      </div>
      {activity.length === 0 ? (
        <p className="text-[12px] text-ink-500 text-center py-6">Quiet day so far.</p>
      ) : (
        <ul className="space-y-2.5">
          {activity.slice(0, 8).map(a => (
            <li key={a.id} className="flex items-start gap-2.5">
              <span className={`text-sm leading-none ${iconFor[a.kind].tone}`}>{iconFor[a.kind].ch}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] text-ink-50">{a.message}</div>
                <div className="text-[10.5px] text-ink-500 font-mono">{new Date(a.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================================================================
   DEMAND FORECAST 7-DAY BARS
   ============================================================================ */

function DemandForecast({ demand }: { demand: { dayLabel: string; predicted: number; isHot?: boolean }[] }) {
  const max = Math.max(1, ...demand.map(d => d.predicted));
  const hotDays = demand.filter(d => d.isHot).map(d => d.dayLabel);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[15px] font-semibold">Demand forecast</h3>
        <Link href="/schedule/forecast" className="text-[11px] text-brand-300 hover:underline">7-day view →</Link>
      </div>
      <p className="text-[11px] text-ink-500 mb-4 font-mono uppercase tracking-[0.12em]">Predicted staffing</p>

      <div className="flex items-end gap-2 h-32">
        {demand.map((d, i) => {
          const h = (d.predicted / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[10px] text-ink-500 font-mono tabular-nums">{d.predicted}</div>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(6, h)}%`,
                  background: d.isHot
                    ? "linear-gradient(180deg, rgba(241,122,142,0.6), rgba(241,122,142,0.2))"
                    : "linear-gradient(180deg, rgba(106,162,255,0.5), rgba(106,162,255,0.15))",
                }}
              />
              <div className={`text-[10px] mt-1 ${d.isHot ? "text-danger font-semibold" : "text-ink-500"}`}>
                {d.dayLabel}
              </div>
            </div>
          );
        })}
      </div>

      {hotDays.length > 0 && (
        <div className="mt-4 p-2.5 rounded-md bg-warn/8 border border-warn/30 flex items-start gap-2 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 text-warn mt-0.5 shrink-0" />
          <span className="text-ink-300">
            <b className="text-warn">{hotDays.join(", ")}</b> projected as high-demand — consider hot-shift premium.
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   WEEK STATS
   ============================================================================ */

function WeekStats({ weekStats }: { weekStats: { hours: number; shifts: number; cost: string; ot: number } }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold">This week</h3>
        <Link href="/reports" className="text-[11px] text-brand-300 hover:underline">Reports →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Hours scheduled" value={weekStats.hours.toFixed(0)} />
        <Stat label="Shifts" value={String(weekStats.shifts)} />
        <Stat label="Labor cost" value={weekStats.cost} />
        <Stat label="OT hours" value={weekStats.ot.toFixed(1)} tone={weekStats.ot > 10 ? "warn" : "info"} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "info" }: { label: string; value: string; tone?: "info" | "warn" }) {
  return (
    <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-500">{label}</div>
      <div className={`font-display text-[24px] font-medium leading-none mt-1 tabular-nums ${tone === "warn" ? "text-warn" : "grad-text-accent"}`}>
        {value}
      </div>
    </div>
  );
}
