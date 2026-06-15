"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, X, Mail, Sparkles, ExternalLink, BookOpen } from "lucide-react";

/**
 * "?" button in the topbar that opens a contextual help panel.
 *
 * The panel surfaces three things, in order of usefulness for a non-technical
 * customer who got stuck:
 *
 *   1. **One-paragraph tip for THIS page.** Each route gets its own short
 *      explainer. If the user is on /schedule and confused, opening help
 *      should explain what they're looking at, not show generic FAQ.
 *
 *   2. **"Just ask the assistant"** — links to the global ⌘K palette so they
 *      can type their question in plain English instead of hunting for docs.
 *
 *   3. **Contact support email** — single mailto link, no contact form maze.
 *
 * This deliberately stays small and offline-friendly. No external doc site to
 * maintain; no chat widget to integrate; no overhead. Just enough to keep a
 * confused user from rage-quitting.
 */

// Per-route tips. Path prefix → { title, body }. The longest matching prefix
// wins, so /schedule/coverage falls back to /schedule if no specific entry.
const TIPS: Record<string, { title: string; body: string }> = {
  "/dashboard": {
    title: "Your home base",
    body: "This is the snapshot of what's happening across your team today. The cards across the top are real-time — labor cost, open shifts, who's clocked in, and your compliance score. Below that you see today's roster and what to do next.",
  },
  "/schedule": {
    title: "Where you build the week",
    body: "Click any empty cell to add a shift. Drag the edges to resize. The colored bars are scheduled shifts; the dashed outlines are 'open shifts' anyone on your team can claim. Use 'Generate with AI' for help filling a whole week at once.",
  },
  "/attendance": {
    title: "Clock-ins and timecards",
    body: "Anyone with their phone (or a workspace kiosk) can clock in here. Punches are stamped with location + a selfie for proof. The Review tab is where you approve, edit, or flag unusual entries before payroll.",
  },
  "/open-shifts": {
    title: "Shifts looking for a body",
    body: "These are shifts you haven't assigned yet. You can publish them so eligible employees see and claim them first-come-first-served, or auto-offer them to your best matches with one click.",
  },
  "/time-off": {
    title: "Time-off requests",
    body: "Employees submit requests here. As a manager you'll see a small badge in the sidebar when there are pending ones to approve. Approving deducts from their PTO balance automatically.",
  },
  "/hr/members": {
    title: "Your team list",
    body: "Everyone in your workspace, what they're paid, their availability, and which locations they can work. Click a row to edit. Use the Invite button to send someone an email link to join.",
  },
  "/settings/locations": {
    title: "Where your team works",
    body: "Each location has an address and a clock-in zone — a circle around it that controls how close someone has to be to punch in. Bigger circle = people can clock in from farther away. Drag the map pin to move the center.",
  },
  "/settings/integrations": {
    title: "Connect your other tools",
    body: "Hook ShyftForce up to your payroll provider (Finch covers 60+), Slack, and more. Each integration shows whether it's been connected on this workspace yet.",
  },
  "/settings/billing": {
    title: "Plan, seats, and invoices",
    body: "Your current plan, how many of your included seats are used, and what your next invoice will look like. Upgrades and downgrades go through Stripe's secure checkout — no card info touches our app.",
  },
  "/compliance": {
    title: "Are we following the rules?",
    body: "Different states + cities require things like advance schedule notice ('predictability pay'), rest gaps between shifts, and overtime triggers. This page flags any violations BEFORE they hit your payroll.",
  },
  "/more": {
    title: "Everything else",
    body: "Every tool in your workspace, organized by topic. Your day-to-day work happens in the sidebar; this is the full toolbox for when you need something less common.",
  },
};

function tipFor(path: string): { title: string; body: string } {
  // longest-prefix match
  const keys = Object.keys(TIPS).sort((a, b) => b.length - a.length);
  const k = keys.find(prefix => path === prefix || path.startsWith(prefix + "/"));
  return k ? TIPS[k] : {
    title: "Need a hand?",
    body: "Ask the AI assistant your question in plain English, or email us — we read every message.",
  };
}

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tip = tipFor(path);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openCopilot() {
    setOpen(false);
    // Topbar listens for ⌘K/Ctrl+K and opens the palette → escalates to Co-pilot
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }));
  }

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        title="Help (this page)"
        aria-label="Help"
        className="p-2 rounded-md hover:bg-white/[0.04] text-ink-400 hover:text-ink-200 transition"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed right-4 top-16 z-50 w-[360px] card p-0 overflow-hidden shadow-2xl animate-scale-in origin-top-right"
          role="dialog"
          aria-label="Help panel"
        >
          {/* header */}
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-brand-300" />
              <span className="text-sm font-semibold">Help</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/[0.04]" aria-label="Close">
              <X className="w-4 h-4 text-ink-500" />
            </button>
          </div>

          {/* contextual tip */}
          <div className="px-4 py-3.5 border-b border-white/[0.06]">
            <div className="text-[10px] font-mono uppercase tracking-wider text-brand-400 mb-1.5">
              About this page
            </div>
            <div className="font-semibold text-sm">{tip.title}</div>
            <p className="text-[13px] text-ink-400 mt-1 leading-relaxed">{tip.body}</p>
          </div>

          {/* ask the AI */}
          <button
            onClick={openCopilot}
            className="w-full text-left px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.03] transition flex items-start gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Ask the AI assistant</div>
              <div className="text-[12px] text-ink-500 mt-0.5">
                Type your question in plain English. Faster than docs.
              </div>
            </div>
            <kbd className="kbd shrink-0 mt-1">⌘K</kbd>
          </button>

          {/* contact support */}
          <a
            href="mailto:support@shyftforce.com?subject=Help%20with%20ShyftForce"
            className="block px-4 py-3 hover:bg-white/[0.03] transition flex items-start gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] text-ink-300 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Email support</div>
              <div className="text-[12px] text-ink-500 mt-0.5 truncate">
                support@shyftforce.com — we read every message
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-ink-500 shrink-0 mt-1.5" />
          </a>
        </div>
      )}
    </>
  );
}
