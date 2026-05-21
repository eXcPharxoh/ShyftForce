"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bolt } from "@/components/ui/logo";
import {
  Calendar, Clock, Users, FileText, ShieldCheck, Download, UserPlus,
  MessageSquare, ShoppingBag, Activity, Plus, Phone, Bed, Truck,
  GraduationCap, ImageIcon, HardHat, BarChart3, Settings, MapPin,
  Sparkles, Search,
} from "lucide-react";

/**
 * ⌘K command palette — global jump-to-anywhere + actions + Co-pilot escalation.
 *
 * Design from design_handoff_shyftforce/README.md:
 *   - Frosted mask: rgba(5,8,16,0.7) + blur(8px)
 *   - 680px panel centered
 *   - Bolt + input + ESC kbd
 *   - Result groups: Co-pilot suggestions (gradient highlight on first), Navigate, Action
 *   - Footer: ↑↓ navigate · ↵ select | Powered by Claude · 24ms
 *   - Animations: maskIn (0.2s) + cmdkIn (0.3s with translate+scale)
 *
 * Keyboard:
 *   - ⌘K / Ctrl-K: toggle (handled by Topbar / global listener)
 *   - Typing: filters list
 *   - ↑/↓: move selection
 *   - ↵: execute selected
 *   - ESC: close
 *   - When no commands match, pressing ↵ on "Ask Co-pilot…" opens the full chat panel.
 */

type CommandKind = "copilot" | "navigate" | "action";

type Command = {
  id: string;
  kind: CommandKind;
  label: string;
  icon: any;
  /** Free-text keywords for fuzzy matching. */
  keywords?: string;
  /** If set, clicking navigates to this href. */
  href?: string;
  /** If set, run this action instead of navigating. */
  onRun?: () => void | Promise<void>;
};

const NAV_COMMANDS: Command[] = [
  { id: "nav-home",       kind: "navigate", label: "Go to Home",         icon: Activity,      href: "/dashboard" },
  { id: "nav-schedule",   kind: "navigate", label: "Go to Schedule",     icon: Calendar,      href: "/schedule" },
  { id: "nav-open-shifts",kind: "navigate", label: "Go to Open Shifts",  icon: ShoppingBag,   href: "/open-shifts" },
  { id: "nav-attendance", kind: "navigate", label: "Go to Attendance",   icon: Clock,         href: "/attendance" },
  { id: "nav-time-off",   kind: "navigate", label: "Go to Time Off",     icon: Clock,         href: "/time-off" },
  { id: "nav-team",       kind: "navigate", label: "Go to Team / HR",    icon: Users,         href: "/hr/members" },
  { id: "nav-messenger",  kind: "navigate", label: "Go to Messenger",    icon: MessageSquare, href: "/messenger" },
  { id: "nav-reports",    kind: "navigate", label: "Go to Reports",      icon: BarChart3,     href: "/reports" },
  { id: "nav-compliance", kind: "navigate", label: "Go to Compliance",   icon: ShieldCheck,   href: "/compliance" },
  { id: "nav-locations",  kind: "navigate", label: "Go to Locations",    icon: MapPin,        href: "/settings/locations" },
  { id: "nav-billing",    kind: "navigate", label: "Go to Billing",      icon: FileText,      href: "/settings/billing" },
  { id: "nav-settings",   kind: "navigate", label: "Go to Settings",     icon: Settings,      href: "/more" },
  // Vertical jumps
  { id: "nav-classes",    kind: "navigate", label: "Go to Class schedule",    icon: GraduationCap, href: "/classes",     keywords: "fitness" },
  { id: "nav-pt",         kind: "navigate", label: "Go to Personal Training", icon: Users,         href: "/pt-sessions", keywords: "fitness PT trainer" },
  { id: "nav-rooms",      kind: "navigate", label: "Go to Rooms",             icon: Bed,           href: "/rooms",       keywords: "hospitality hotel housekeeping" },
  { id: "nav-lf",         kind: "navigate", label: "Go to Lost & Found",      icon: FileText,      href: "/lost-found",  keywords: "hospitality" },
  { id: "nav-vehicles",   kind: "navigate", label: "Go to Fleet vehicles",    icon: Truck,         href: "/settings/vehicles", keywords: "field service" },
  { id: "nav-vm",         kind: "navigate", label: "Go to VM tasks",          icon: ImageIcon,     href: "/vm-tasks",    keywords: "retail visual merch" },
  { id: "nav-shrink",     kind: "navigate", label: "Go to Shrink log",        icon: BarChart3,     href: "/shrink",      keywords: "grocery loss" },
  { id: "nav-safety",     kind: "navigate", label: "Go to Safety briefings",  icon: HardHat,       href: "/safety",      keywords: "construction OSHA" },
  { id: "nav-callout",    kind: "navigate", label: "Go to Sub callouts",      icon: Phone,         href: "/sub-callout", keywords: "education substitute" },
  { id: "nav-on-call",    kind: "navigate", label: "Go to On-call schedule",  icon: Phone,         href: "/on-call",     keywords: "healthcare" },
  { id: "nav-ratios",     kind: "navigate", label: "Go to Patient ratios",    icon: Activity,      href: "/settings/patient-ratios", keywords: "healthcare nursing" },
];

const ACTION_COMMANDS: Command[] = [
  { id: "act-new-shift",     kind: "action", label: "Create a new shift",          icon: Plus,        href: "/schedule" },
  { id: "act-open-shift",    kind: "action", label: "Create an open shift",        icon: ShoppingBag, href: "/open-shifts" },
  { id: "act-invite",        kind: "action", label: "Invite a new employee",       icon: UserPlus,    href: "/hr/members" },
  { id: "act-approve-pto",   kind: "action", label: "Approve all pending time-off requests", icon: Clock, href: "/time-off" },
  { id: "act-export-csv",    kind: "action", label: "Export labor cost report (CSV)", icon: Download, href: "/reports" },
  { id: "act-post-briefing", kind: "action", label: "Post a safety briefing",      icon: HardHat,     href: "/safety" },
  { id: "act-log-shrink",    kind: "action", label: "Log a shrink event",          icon: BarChart3,   href: "/shrink" },
  { id: "act-callout",       kind: "action", label: "Page substitute teachers",    icon: Phone,       href: "/sub-callout" },
  { id: "act-clock",         kind: "action", label: "Clock in / clock out",        icon: Clock,       href: "/attendance" },
];

const COPILOT_SUGGESTIONS: Command[] = [
  { id: "cp-1", kind: "copilot", label: "Schedule Jordan and Aisha at Yoko Luna for Saturday 6pm-2am", icon: Sparkles },
  { id: "cp-2", kind: "copilot", label: "Who's worked the most overtime this period?",                  icon: Sparkles },
  { id: "cp-3", kind: "copilot", label: "Find a replacement for Liam's Friday night shift",             icon: Sparkles },
  { id: "cp-4", kind: "copilot", label: "Show me labor cost vs forecast for this week",                 icon: Sparkles },
];

export function CmdKPalette({
  open,
  onClose,
  onOpenCopilot,
}: {
  open: boolean;
  onClose: () => void;
  /** Escalate to the full Co-pilot chat panel with this prompt. */
  onOpenCopilot: (initialPrompt?: string) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open + reset state
  useEffect(() => {
    if (!open) return;
    setQ(""); setActive(0);
    // Schedule focus after the render flush so the input is mounted
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Build + filter command list
  const all = useMemo(() => [...COPILOT_SUGGESTIONS, ...NAV_COMMANDS, ...ACTION_COMMANDS], []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(c =>
      c.label.toLowerCase().includes(needle) ||
      (c.keywords ?? "").toLowerCase().includes(needle)
    );
  }, [q, all]);

  // Always offer "Ask Co-pilot anyway" as the last option when typing
  const showAskCopilotFallback = q.trim().length > 0;
  const finalList = showAskCopilotFallback
    ? [...filtered, { id: "cp-anyway", kind: "copilot" as const, label: `Ask Co-pilot: "${q}"`, icon: Bolt } as Command]
    : filtered;

  // Clamp active index when list changes
  useEffect(() => {
    setActive(a => Math.min(a, Math.max(0, finalList.length - 1)));
  }, [finalList.length]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, finalList.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = finalList[active];
        if (cmd) run(cmd);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finalList, active]);

  // Scroll active item into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-cmdk-idx="${active}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function run(cmd: Command) {
    if (cmd.kind === "copilot") {
      // Use the typed query if any, else the suggested prompt
      const prompt = cmd.id === "cp-anyway" ? q : cmd.label;
      onClose();
      onOpenCopilot(prompt);
      return;
    }
    onClose();
    if (cmd.onRun) { void cmd.onRun(); return; }
    if (cmd.href) router.push(cmd.href);
  }

  if (!open) return null;

  // Group filtered results for visual sectioning
  const groups: { label: string; tone: string; items: { cmd: Command; idx: number }[] }[] = [
    { label: "Co-pilot suggestions", tone: "brand",  items: [] },
    { label: "Navigate",             tone: "info",   items: [] },
    { label: "Action",               tone: "warn",   items: [] },
  ];
  finalList.forEach((cmd, idx) => {
    const g = cmd.kind === "copilot" ? groups[0] : cmd.kind === "navigate" ? groups[1] : groups[2];
    g.items.push({ cmd, idx });
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: "rgba(5,8,16,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[680px] rounded-lg border border-white/[0.12] shadow-glow animate-scale-in overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(13,20,34,0.95) 0%, rgba(8,13,24,0.95) 100%)",
          backdropFilter: "blur(20px) saturate(160%)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06]">
          <Bolt size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Ask Co-pilot anything, or jump to anywhere…"
            className="flex-1 bg-transparent outline-none border-none text-ink-50 text-[16px] font-sans placeholder:text-ink-500"
          />
          <kbd className="kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto scroll-thin">
          {finalList.length === 0 ? (
            <div className="p-10 text-center text-ink-500 text-sm">
              No matches. Press <kbd className="kbd mx-1">↵</kbd> to ask Co-pilot anyway.
            </div>
          ) : (
            groups.filter(g => g.items.length > 0).map(g => (
              <div key={g.label}>
                <div className="px-4 pt-3 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-500">
                  {g.label}
                </div>
                {g.items.map(({ cmd, idx }) => {
                  const Icon = cmd.icon;
                  const isActive = idx === active;
                  return (
                    <button
                      key={cmd.id}
                      data-cmdk-idx={idx}
                      onClick={() => run(cmd)}
                      onMouseEnter={() => setActive(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 border-l-2 text-left transition-colors ${
                        isActive
                          ? "border-l-brand-500 bg-brand-500/8"
                          : "border-l-transparent hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        cmd.kind === "copilot"
                          ? "bg-brand-500/15 text-brand-300"
                          : "bg-white/[0.04] text-ink-300"
                      }`}>
                        {cmd.kind === "copilot" ? <Sparkles className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                      </div>
                      <span className="flex-1 text-[13.5px] text-ink-50 truncate">{cmd.label}</span>
                      <span className={`text-[10px] font-mono uppercase tracking-[0.06em] px-2 py-0.5 rounded ${
                        cmd.kind === "copilot" ? "text-brand-300 bg-brand-500/10"
                          : cmd.kind === "navigate" ? "text-ink-300 bg-white/[0.04]"
                          : "text-warn bg-warn/10"
                      }`}>
                        {cmd.kind}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-ink-500 font-mono">
          <span><kbd className="kbd">↑↓</kbd> navigate · <kbd className="kbd">↵</kbd> select</span>
          <span>Powered by Claude · 24ms</span>
        </div>
      </div>
    </div>
  );
}
