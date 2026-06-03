"use client";

import Link from "next/link";
import { Clock, Calendar, MessageSquare, FileText, Sparkles, ArrowRight, AlertCircle } from "lucide-react";

/**
 * Employee dashboard — what a non-manager sees on the home page.
 *
 * Employees don't need labor cost, compliance %, the today-roster timeline, the
 * locations punch map, the turnover widget, or any of the manager firehose.
 * They need three things, in this order:
 *   1. "When am I next working?" — their next scheduled shift, big and clear
 *   2. "What needs my attention?" — pending shift offers, time-off decisions
 *   3. "Quick links to what I actually do" — clock in, my schedule, time-off, etc.
 *
 * Keep this lean. Adding more is the easy mistake; not adding more is the win.
 */

export type EmployeeShift = {
  id: string;
  startsAt: string;
  endsAt: string;
  position: string | null;
  locationName: string | null;
};

export type EmployeeOffer = {
  id: string;
  shiftStartsAt: string;
  shiftEndsAt: string;
  shiftPosition: string | null;
  locationName: string | null;
  expiresAt: string;
};

export function EmployeeHome({
  name,
  greeting,
  nextShift,
  upcomingShifts,
  pendingOffers,
  pendingTimeOffCount,
}: {
  name: string;
  greeting: string;
  nextShift: EmployeeShift | null;
  upcomingShifts: EmployeeShift[];
  pendingOffers: EmployeeOffer[];
  pendingTimeOffCount: number;
}) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Warm greeting */}
      <header>
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500 mb-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{greeting}, {name.split(" ")[0]}</h1>
      </header>

      {/* Pending offers — top of the page when present, because they're time-sensitive */}
      {pendingOffers.length > 0 && (
        <section className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-amber-400">
            ⚡ Coverage requests — first to claim wins
          </div>
          {pendingOffers.slice(0, 3).map((o) => (
            <Link
              key={o.id}
              href="/open-shifts"
              className="card p-4 flex items-center gap-3 hover:border-amber-500/40 transition border-amber-500/20 bg-amber-500/[0.04]"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {fmtRange(o.shiftStartsAt, o.shiftEndsAt)}
                  {o.shiftPosition && <span className="text-ink-400 font-normal"> · {o.shiftPosition}</span>}
                </div>
                <div className="text-[12px] text-ink-500 mt-0.5">
                  {o.locationName ?? "Location TBD"} · expires {fmtRelative(o.expiresAt)}
                </div>
              </div>
              <span className="btn-primary btn-sm">Claim</span>
            </Link>
          ))}
        </section>
      )}

      {/* Your next shift — the most important question an employee has on this page */}
      <section>
        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-brand-400 mb-2">
          Your next shift
        </div>
        {nextShift ? (
          <Link
            href="/schedule"
            className="card p-6 block hover:border-brand-500/40 transition"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-soft">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-semibold tabular-nums">
                  {fmtFullDate(nextShift.startsAt)}
                </div>
                <div className="text-lg text-brand-300 mt-1 tabular-nums">
                  {fmtTimeRange(nextShift.startsAt, nextShift.endsAt)}
                </div>
                <div className="text-[13px] text-ink-400 mt-2">
                  {nextShift.position ?? "Shift"}
                  {nextShift.locationName && <> · {nextShift.locationName}</>}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-ink-500 shrink-0 mt-2" />
            </div>
          </Link>
        ) : (
          <div className="card p-6 text-center">
            <Calendar className="w-8 h-8 mx-auto text-ink-500 mb-2" />
            <div className="font-semibold text-sm">No upcoming shifts</div>
            <div className="text-[12px] text-ink-500 mt-1">
              Check the schedule or ask your manager.
            </div>
          </div>
        )}
      </section>

      {/* This week at a glance */}
      {upcomingShifts.length > 1 && (
        <section>
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-400 mb-2">
            Coming up this week
          </div>
          <div className="card divide-y divide-white/[0.06]">
            {upcomingShifts.slice(1, 5).map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] text-ink-300 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{fmtShortDate(s.startsAt)}</div>
                  <div className="text-[12px] text-ink-500 mt-0.5 tabular-nums">
                    {fmtTimeRange(s.startsAt, s.endsAt)}
                    {s.position && <> · {s.position}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions — small + focused. The 4 things an employee actually does. */}
      <section>
        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-400 mb-2">
          Quick actions
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink href="/attendance" icon={Clock}        label="Clock in" tone="brand" />
          <QuickLink href="/time-off"   icon={Calendar}     label={pendingTimeOffCount > 0 ? `Time off (${pendingTimeOffCount})` : "Request time off"} />
          <QuickLink href="/messenger"  icon={MessageSquare} label="Message" />
          <QuickLink href="/worker/profile" icon={FileText}  label="My profile" />
        </div>
      </section>

      {/* Co-pilot prompt — for "I don't know how to do this" moments */}
      <button
        onClick={() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }));
        }}
        className="w-full card p-4 hover:border-brand-500/40 transition text-left flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 text-white flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Ask the assistant</div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            &ldquo;What's my schedule next week?&rdquo; · &ldquo;Request next Friday off&rdquo; · &ldquo;Who's working with me tomorrow?&rdquo;
          </div>
        </div>
        <kbd className="kbd shrink-0">⌘K</kbd>
      </button>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, tone }: { href: string; icon: any; label: string; tone?: "brand" }) {
  return (
    <Link
      href={href}
      className={`card p-4 hover:border-brand-500/40 transition flex flex-col items-center gap-2 text-center ${tone === "brand" ? "border-brand-500/30 bg-brand-500/[0.04]" : ""}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone === "brand" ? "bg-brand-500/15 text-brand-300" : "bg-white/[0.04] text-ink-300"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-[12px] font-medium leading-tight">{label}</div>
    </Link>
  );
}

/* ─── small date helpers (local-only — don't pull a lib for this) ─── */

function fmtFullDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (sameDay(d, today)) return `Today, ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTimeRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  return `${fmtTime(s)} – ${fmtTime(e)}`;
}
function fmtRange(startIso: string, endIso: string): string {
  return `${fmtShortDate(startIso)} · ${fmtTimeRange(startIso, endIso)}`;
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: d.getMinutes() === 0 ? undefined : "2-digit", hour12: true });
}
function fmtRelative(iso: string): string {
  const diffMs = +new Date(iso) - Date.now();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 0) return "expired";
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  const days = Math.round(hrs / 24);
  return `in ${days}d`;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
