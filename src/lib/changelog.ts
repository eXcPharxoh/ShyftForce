/**
 * Changelog entries. Newest first. Each entry is one release date with a
 * short summary and a list of changes grouped by kind.
 *
 * Conventions:
 *   - date is YYYY-MM-DD (ISO) so it sorts naturally and parses cleanly.
 *   - title is a short noun-phrase summary of the release (under 60 chars).
 *   - kinds: "new" (features), "improved" (existing UX/perf), "fixed"
 *     (bugs), "ops" (back-end changes users wouldn't notice).
 *
 * Adding a release: prepend a new ChangelogEntry to the ENTRIES array.
 */

export type ChangeKind = "new" | "improved" | "fixed" | "ops";

export type Change = { kind: ChangeKind; text: string };
export type ChangelogEntry = {
  date: string; // ISO YYYY-MM-DD
  title: string;
  summary?: string;
  changes: Change[];
};

export const KIND_LABEL: Record<ChangeKind, string> = {
  new:      "New",
  improved: "Improved",
  fixed:    "Fixed",
  ops:      "Behind the scenes",
};

export const KIND_TONE: Record<ChangeKind, string> = {
  new:      "bg-brand-500/15 text-brand-200 border-brand-500/30",
  improved: "bg-emerald-500/12 text-emerald-200 border-emerald-500/30",
  fixed:    "bg-amber-500/12 text-amber-200 border-amber-500/30",
  ops:      "bg-white/[0.06] text-ink-300 border-white/[0.10]",
};

export const ENTRIES: ChangelogEntry[] = [
  {
    date: "2026-06-15",
    title: "Help center, simpler dashboard, schedule cleanup",
    summary: "Built the help center, redesigned the manager dashboard around a single 'do this next' card, and trimmed the schedule UI down to its essentials.",
    changes: [
      { kind: "new",      text: "Help center at /help with 21 plain-English articles across 9 categories, plus search and per-article SEO." },
      { kind: "new",      text: "'Do this next' hero card on the manager dashboard: surfaces the most urgent action (publish drafts, approve time off, fill open shifts) with one clear CTA." },
      { kind: "improved", text: "Schedule page redesigned to match the Agendrix shape — single toolbar, open shifts pinned to the top, slimmer shift cards with a colored left-edge stripe." },
      { kind: "improved", text: "Plain-English pass across the app: 'geofence' is now 'clock-in zone' everywhere users see it. Acronym soup (GDPR, HMAC, OAuth, EWA) replaced with words a busy manager understands." },
      { kind: "improved", text: "Landing page conversion polish: tighter hero copy ('Run your team on autopilot'), FAQ section, comparison table vs Sling / Deputy / When I Work, sticky mobile CTA, risk-reversal band by pricing." },
      { kind: "fixed",    text: "Email and SMS no longer silently succeed when env vars are missing in production — users get a clear error instead of a frozen verify-email screen." },
      { kind: "fixed",    text: "POS connect form: hid Toast / Square / Clover until their integrations fully ship. Manual entry is the visible default with honest 'coming soon' copy." },
      { kind: "fixed",    text: "EWA settings: hid scaffolded payout providers (Branch, Tapcheck, DailyPay) from the dropdown — only the internal-ledger flow that actually works shows up." },
      { kind: "fixed",    text: "/training, /hr/reviews, /settings/pto cleaned up: removed 'coming soon' UI that read as broken to a paying customer." },
      { kind: "fixed",    text: "Landing page footer: replaced 11+ dead `href='#'` links with real routes and removed sections that pointed nowhere." },
      { kind: "ops",      text: "/api/attendance/live bounded to last 24h + take 5000 — no more org-wide AttendanceLog scans." },
      { kind: "ops",      text: "/api/reports/export capped MAX_MEMBERS=5000, MAX_SHIFTS=10000 — prevents lambda OOM on large-org CSV exports." },
      { kind: "ops",      text: "Marketplace coverage autopilot uses createMany — was N+1 inserts per uncovered shift." },
      { kind: "ops",      text: "Rate limit added to /api/auth/reset-password (10 per 10 min by IP)." },
      { kind: "ops",      text: "Audit log gaps closed on meeting-room booking, hot-desk booking, and custom-role unassignment deletes." },
    ],
  },
  {
    date: "2026-06-12",
    title: "Tier 3 UX — Simple Mode, conversational onboarding, AI-first schedule",
    summary: "The 'I am not tech-savvy' release. Simple Mode hides advanced features, the onboarding wizard now has a 'just talk to the assistant' path, and the schedule page leads with an AI prompt banner.",
    changes: [
      { kind: "new", text: "Per-org Simple Mode vs Pro Mode toggle. Simple mode hides custom roles, webhooks, API keys, audit log, advanced reports, etc." },
      { kind: "new", text: "Conversational onboarding: a single 'tell the assistant about your business' chat that asks 4 questions and provisions the workspace." },
      { kind: "new", text: "AI prompt banner on the schedule page: type 'I need 2 cashiers Mon–Fri 9–5' and the assistant drafts the week." },
      { kind: "new", text: "Co-pilot tools now back the in-app AI hints: create_pto_policy, create_custom_role, list_permission_catalog." },
      { kind: "improved", text: "Inline /setup wizard completes location + team + first shift without leaving the page." },
      { kind: "improved", text: "CSV import wizards for members, shifts, and locations — paste or upload, mapping shown before commit." },
      { kind: "improved", text: "Industry starter packs auto-fill PTO categories, blackout dates, and recurring shift templates per vertical." },
      { kind: "improved", text: "Role-based dashboards: employees see their own next shift / offers / time-off; managers see the operational view." },
      { kind: "improved", text: "Empty-state CTAs on key list pages now open one-tap actions instead of dumping the user into a config tree." },
    ],
  },
  {
    date: "2026-06-08",
    title: "Geo + face match + integrations",
    summary: "GPS-verified clock-in goes live with selfie liveness check. Finch payroll, Twilio SMS, VAPID push, and live POS adapters all ship.",
    changes: [
      { kind: "new", text: "Geofenced clock-in: GPS-verified punches, per-location radius, out-of-zone flagging for manager review." },
      { kind: "new", text: "Face-match verification on clock-in (optional per org). Liveness check prevents photo-of-photo spoofs." },
      { kind: "new", text: "Finch payroll integration: 60+ providers (Gusto, ADP, Paychex, QuickBooks, Rippling…)." },
      { kind: "new", text: "Twilio SMS integration: shift offers, schedule changes, time-off decisions delivered via text." },
      { kind: "new", text: "VAPID web-push notifications: works on iOS 16.4+, Android, desktop browsers." },
      { kind: "new", text: "Predictive scheduling compliance engine: 6 rule families (max weekly/daily hours, min rest, meal breaks, consecutive days, predictability pay) with city presets for NYC / Seattle / Oregon / Chicago / Philadelphia." },
      { kind: "improved", text: "Auto-fill open shifts: rules-based engine that honors availability + time-off + skill tier." },
      { kind: "improved", text: "Open-shift marketplace: three-wave auto-offer (top 3 → top 5 → all qualified) with first-respond-wins claim." },
    ],
  },
];

/** Latest entry first. */
export function latestRelease() {
  return ENTRIES[0];
}
