import Link from "next/link";
import {
  Calendar, ShoppingBag, Plane, ClipboardCheck, Send,
  ArrowRight, Sparkles,
} from "lucide-react";

/**
 * "Do this next" hero card for managers.
 *
 * The dashboard used to greet the manager with 6+ widgets at once — labor
 * cost, compliance %, roster, activity, demand, suggestions. A non-tech-
 * savvy manager doesn't want a status briefing; they want to know what
 * they need to *do* this morning. So we compute the single most urgent
 * action from real data and put it front and center, with 3 quick-tap
 * shortcuts to the next most common ones.
 *
 * Priority order (top wins):
 *  1. Drafts → publish the schedule
 *  2. Pending time-off → decide
 *  3. Unapproved timesheets → approve
 *  4. Open shifts → fill
 *  5. No shifts yet this week → build it
 *  6. All caught up → coffee
 *
 * Caller passes counts so this stays a server-renderable client-free shell.
 */
export type PriorityCounts = {
  draftShifts: number;
  pendingTimeOff: number;
  unapprovedTimesheets: number;
  openShifts: number;
  weekShifts: number;
};

type Action = {
  id: string;
  emoji: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  // tone drives the gradient + emphasis level
  tone: "urgent" | "needed" | "ready" | "calm";
};

function pickHero(c: PriorityCounts): Action {
  if (c.draftShifts > 0) return {
    id: "publish",
    emoji: "📨",
    title: `Your schedule is ready to send`,
    detail: `${c.draftShifts} draft shift${c.draftShifts === 1 ? "" : "s"} need${c.draftShifts === 1 ? "s" : ""} to be published — your team can see them as soon as you click.`,
    href: "/schedule",
    cta: "Open schedule",
    tone: "ready",
  };
  if (c.pendingTimeOff > 0) return {
    id: "timeoff",
    emoji: "🏖️",
    title: `${c.pendingTimeOff} time-off request${c.pendingTimeOff === 1 ? "" : "s"} waiting on you`,
    detail: `Approve or decline so your team can plan ahead. Takes about a minute.`,
    href: "/time-off",
    cta: "Review requests",
    tone: "needed",
  };
  if (c.unapprovedTimesheets > 0) return {
    id: "timesheets",
    emoji: "⏱️",
    title: `${c.unapprovedTimesheets} timesheet${c.unapprovedTimesheets === 1 ? "" : "s"} need a thumbs-up`,
    detail: `Approve them before payroll runs so everyone gets paid right.`,
    href: "/attendance",
    cta: "Review timesheets",
    tone: "needed",
  };
  if (c.openShifts > 0) return {
    id: "open",
    emoji: "🆘",
    title: `${c.openShifts} shift${c.openShifts === 1 ? "" : "s"} still need someone`,
    detail: `Let us send offers to your best-fit team members — first to claim it wins.`,
    href: "/open-shifts",
    cta: "Fill these shifts",
    tone: "urgent",
  };
  if (c.weekShifts === 0) return {
    id: "build",
    emoji: "🗓️",
    title: `Build this week's schedule`,
    detail: `Nothing scheduled yet. Drop shifts in by hand, or ask the assistant to draft a week for you.`,
    href: "/schedule",
    cta: "Open schedule",
    tone: "ready",
  };
  return {
    id: "calm",
    emoji: "☕",
    title: "You're all caught up",
    detail: "No urgent decisions. Want to peek at what's next, or take a coffee break?",
    href: "/schedule",
    cta: "See the week",
    tone: "calm",
  };
}

/**
 * Build a list of quick-tap shortcuts to render under the hero. Skip
 * whichever one is already the hero so we don't duplicate it. Keep the
 * top 3 by importance so the row doesn't get crowded.
 */
type Shortcut = { id: string; href: string; label: string; count?: number; icon: any };
function pickShortcuts(c: PriorityCounts, heroId: string): Shortcut[] {
  const all: Shortcut[] = [
    { id: "publish",    href: "/schedule",        label: "Publish drafts",     count: c.draftShifts > 0 ? c.draftShifts : undefined,    icon: Send },
    { id: "timeoff",    href: "/time-off",        label: "Time-off requests",  count: c.pendingTimeOff > 0 ? c.pendingTimeOff : undefined, icon: Plane },
    { id: "timesheets", href: "/attendance",      label: "Approve timesheets", count: c.unapprovedTimesheets > 0 ? c.unapprovedTimesheets : undefined, icon: ClipboardCheck },
    { id: "open",       href: "/open-shifts",     label: "Open shifts",        count: c.openShifts > 0 ? c.openShifts : undefined,       icon: ShoppingBag },
    { id: "build",      href: "/schedule",        label: "This week's schedule", icon: Calendar },
  ];
  const filtered = all.filter(s => s.id !== heroId);
  // Sort so anything with a count comes first
  filtered.sort((a, b) => Number(!!b.count) - Number(!!a.count));
  return filtered.slice(0, 3);
}

const TONE_STYLES: Record<Action["tone"], string> = {
  urgent: "from-rose-500/15 via-rose-500/[0.04] to-transparent border-rose-500/30",
  needed: "from-amber-500/15 via-amber-500/[0.04] to-transparent border-amber-500/30",
  ready:  "from-brand-500/15 via-brand-500/[0.04] to-transparent border-brand-500/30",
  calm:   "from-emerald-500/12 via-emerald-500/[0.03] to-transparent border-emerald-500/20",
};

const CTA_STYLES: Record<Action["tone"], string> = {
  urgent: "bg-rose-500 hover:bg-rose-600 text-white",
  needed: "bg-amber-500 hover:bg-amber-600 text-white",
  ready:  "bg-brand-500 hover:bg-brand-600 text-white",
  calm:   "bg-emerald-500 hover:bg-emerald-600 text-white",
};

export function TodayPriorities({ counts, name }: { counts: PriorityCounts; name: string }) {
  const hero = pickHero(counts);
  const shortcuts = pickShortcuts(counts, hero.id);

  return (
    <section className="space-y-3">
      {/* Hero — ONE big action. Gradient tone tells the manager at a glance
          how urgent it is without them having to read the title first.
          Mobile: card stacks vertically; desktop: detail+CTA side by side. */}
      <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${TONE_STYLES[hero.tone]} p-5 md:p-6`}>
        <div className="flex items-start gap-4 md:gap-5">
          <div className="text-4xl md:text-5xl leading-none shrink-0">{hero.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400 mb-1">
              <Sparkles className="w-3 h-3 inline-block mr-1 mb-0.5" />
              Do this next, {firstName(name)}
            </div>
            <h2 className="text-[18px] md:text-[22px] font-bold leading-tight text-ink-50">{hero.title}</h2>
            <p className="text-[13px] md:text-[14px] text-ink-300 mt-1.5 leading-relaxed max-w-2xl">{hero.detail}</p>
          </div>
          <Link
            href={hero.href}
            className={`hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition shadow-sm shrink-0 ${CTA_STYLES[hero.tone]}`}
          >
            {hero.cta} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {/* Mobile CTA — full-width, stacked under the body */}
        <Link
          href={hero.href}
          className={`md:hidden mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[14px] font-semibold transition ${CTA_STYLES[hero.tone]}`}
        >
          {hero.cta} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick-tap shortcuts — the manager's three next-most-common actions
          rendered as small chips. Anything with a non-zero count gets a
          badge so they can see "3 timesheets" at a glance. Hidden when no
          shortcuts (everything is in the hero already). */}
      {shortcuts.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {shortcuts.map(s => {
            const Icon = s.icon;
            return (
              <Link
                key={s.id}
                href={s.href}
                className="card-hover flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                  <span className="text-[12px] text-ink-200 truncate">{s.label}</span>
                </div>
                {s.count !== undefined && (
                  <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-300 shrink-0">
                    {s.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function firstName(s: string) {
  return (s ?? "").trim().split(/\s+/)[0] ?? "";
}
