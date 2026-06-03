"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, Users, CalendarPlus, ArrowRight, Sparkles, MessagesSquare } from "lucide-react";

/**
 * Quiet Day-1 dashboard — what a new manager sees BEFORE they've done anything.
 *
 * The full HomeShell has 9+ widgets which is overwhelming for someone who just
 * signed up with zero data. This strips it down to:
 *   1. Warm greeting + one-line orientation
 *   2. A giant "Ask the assistant" prompt (the AI Co-pilot — the fastest path
 *      to productivity for non-technical users — type intent in plain English)
 *   3. The 3 manual setup steps in a row of big tappable cards
 *   4. A subtle "Skip to the full dashboard" escape hatch for power users who
 *      want to poke around even with empty data
 *
 * Auto-hides itself once the workspace has any meaningful data
 * (locations + members + shifts), at which point the parent renders HomeShell.
 */
export function QuietDayOne({
  name,
  hasLocation,
  hasTeam,
  hasShift,
  onAskCopilot,
}: {
  name: string;
  hasLocation: boolean;
  hasTeam: boolean;
  hasShift: boolean;
  /** Opens the Co-pilot panel with a pre-filled prompt. Falls back to opening
   *  the global Cmd+K palette via the keyboard shortcut if not provided. */
  onAskCopilot?: (prompt: string) => void;
}) {
  const [skipped, setSkipped] = useState(false);
  if (skipped) return null;

  function ask(prompt?: string) {
    if (onAskCopilot) { onAskCopilot(prompt ?? ""); return; }
    // Fallback: trigger Cmd+K (the palette listens for it globally)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }));
  }

  // All three steps now point at /setup — the inline wizard completes each
  // step in one place instead of dropping the user into the full app for
  // each one. Less context-switching, more clarity.
  const steps = [
    { key: "loc",   label: "Add a location",   blurb: "Where your team clocks in.", href: "/setup", icon: MapPin,      done: hasLocation },
    { key: "team",  label: "Invite your team", blurb: "Send invites by email.",     href: "/setup", icon: Users,       done: hasTeam },
    { key: "shift", label: "Drop a shift",     blurb: "First one on the calendar.", href: "/setup", icon: CalendarPlus, done: hasShift },
  ];
  const nextStep = steps.find(s => !s.done) ?? steps[steps.length - 1];

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-8">
      {/* Warm orientation */}
      <header className="text-center">
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-400 mb-1.5">
          Welcome to your workspace
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Hi {name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-ink-400 mt-1.5">
          Your workspace is empty right now. Pick a path below — or just{" "}
          <button onClick={() => ask("")} className="underline text-brand-300 hover:text-brand-200">
            ask the assistant
          </button>{" "}
          what you want to do, in plain English.
        </p>
      </header>

      {/* AI Co-pilot prompt — the centerpiece. The fastest path for casual users. */}
      <button
        onClick={() => ask("")}
        className="w-full group relative card p-6 hover:border-brand-500/40 hover:bg-brand-500/[0.04] transition text-left"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-soft">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase font-mono tracking-wider text-brand-400 mb-1">
              Just tell me what you want to do
            </div>
            <div className="font-display text-xl group-hover:text-brand-200 transition">
              &ldquo;Schedule Joe for Friday at 9am&rdquo;
            </div>
            <p className="text-[13px] text-ink-400 mt-2">
              Skip the menus. The assistant can create shifts, invite members, set up locations, and more — just ask. Press <kbd className="kbd">⌘K</kbd> any time.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-ink-500 group-hover:text-brand-300 group-hover:translate-x-0.5 transition shrink-0 mt-2" />
        </div>
      </button>

      {/* Three guided setup steps */}
      <div>
        <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 mb-2 px-1">
          Or set it up yourself — takes about 3 minutes
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isNext = s.key === nextStep.key;
            return (
              <Link
                key={s.key}
                href={s.href}
                className={`card p-4 hover:border-brand-500/40 transition flex flex-col gap-3 relative ${
                  s.done ? "bg-emerald-500/[0.04] border-emerald-500/20" : ""
                } ${isNext && !s.done ? "ring-2 ring-brand-500/30" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    s.done ? "bg-emerald-500/15 text-emerald-300" : "bg-brand-500/15 text-brand-300"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Step {i + 1}</span>
                  {s.done && <span className="text-[10px] text-emerald-400 font-semibold ml-auto">DONE</span>}
                  {isNext && !s.done && <span className="text-[10px] text-brand-400 font-semibold ml-auto">START HERE</span>}
                </div>
                <div>
                  <div className="font-semibold text-sm">{s.label}</div>
                  <div className="text-[12px] text-ink-500 mt-0.5">{s.blurb}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Power-user escape hatch */}
      <div className="text-center pt-4 border-t border-white/[0.06]">
        <button
          onClick={() => setSkipped(true)}
          className="text-[12px] text-ink-500 hover:text-ink-300 inline-flex items-center gap-1.5 transition"
        >
          <MessagesSquare className="w-3 h-3" />
          Skip — show me the full dashboard anyway
        </button>
        <div className="text-[11px] text-ink-600 mt-1">
          You can always come back here from the home tab.
        </div>
      </div>
    </div>
  );
}
