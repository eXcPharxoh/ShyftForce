/**
 * Help center registry. Each article is a self-contained TSX component
 * under src/components/help/articles/<slug>.tsx that gets lazy-loaded
 * server-side on the article page. Categories group articles for the
 * /help browse view and the sidebar nav.
 *
 * Conventions:
 *   - slug is kebab-case, used in the URL
 *   - title is in sentence case (not headline case) — friendlier
 *   - summary is one-sentence under 140 chars (shown in browse + search)
 *   - tags are for search keyword matching only
 *   - audience: which user role the article is aimed at
 *   - estReadMinutes: rough estimate, helps users gauge commitment
 *
 * To add a new article: append it here AND create the TSX file.
 */

export type HelpCategory = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  /** Sort order in the browse view. Lower = higher. */
  order: number;
};

export const CATEGORIES: HelpCategory[] = [
  { slug: "getting-started", title: "Getting started",          emoji: "🚀", order: 1, description: "Your first week with ShyftForce" },
  { slug: "scheduling",      title: "Building schedules",       emoji: "🗓️", order: 2, description: "Create, publish, and adjust shifts" },
  { slug: "for-employees",   title: "For your team",            emoji: "👋", order: 3, description: "What employees need to know" },
  { slug: "time-off",        title: "Time off & PTO",           emoji: "🏖️", order: 4, description: "Requests, approvals, and policies" },
  { slug: "compliance",      title: "Labor law & compliance",   emoji: "⚖️", order: 5, description: "Fair Workweek, overtime, and breaks" },
  { slug: "integrations",    title: "Connections & integrations", emoji: "🔌", order: 6, description: "Payroll, POS, SMS, and email" },
  { slug: "industry",        title: "Industry-specific features", emoji: "🏷️", order: 7, description: "Restaurants, security, healthcare, construction" },
  { slug: "account",         title: "Account & billing",        emoji: "💳", order: 8, description: "Plan, seats, security, and data" },
  { slug: "troubleshooting", title: "Something not working?",   emoji: "🛠️", order: 9, description: "Common problems and how to fix them" },
];

export type HelpAudience = "manager" | "employee" | "all";

export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  audience: HelpAudience;
  tags: string[];
  estReadMinutes: number;
  /** Optional: in-app routes that should deep-link to this article. */
  relatedRoutes?: string[];
  /** Resolved at render time — see articleComponent() below. */
};

/**
 * The article registry. Keep alphabetical-by-slug inside each category
 * so it's easy to spot duplicates and gaps.
 */
export const ARTICLES: HelpArticle[] = [
  // Getting started ---------------------------------------------------
  {
    slug: "first-week-checklist",
    title: "Your first week with ShyftForce",
    summary: "The five-step path from signup to your team clocking in. Most people are productive in under an hour.",
    category: "getting-started",
    audience: "manager",
    tags: ["onboarding", "setup", "first time", "checklist"],
    estReadMinutes: 4,
  },
  {
    slug: "inviting-your-team",
    title: "Inviting your team",
    summary: "Three ways to add people: one at a time, paste a list, or upload a spreadsheet.",
    category: "getting-started",
    audience: "manager",
    tags: ["invite", "team", "members", "csv", "import"],
    estReadMinutes: 3,
    relatedRoutes: ["/hr/members"],
  },

  // Scheduling --------------------------------------------------------
  {
    slug: "publishing-a-schedule",
    title: "Publishing your schedule",
    summary: "Drafts vs published — when your team sees the schedule, and how to undo a mistake.",
    category: "scheduling",
    audience: "manager",
    tags: ["publish", "draft", "schedule", "send"],
    estReadMinutes: 3,
    relatedRoutes: ["/schedule"],
  },
  {
    slug: "open-shifts-marketplace",
    title: "Filling open shifts (the marketplace)",
    summary: "How shifts get auto-offered to your team in waves, who claims them, and what to do if nobody bites.",
    category: "scheduling",
    audience: "manager",
    tags: ["open shifts", "marketplace", "callout", "coverage"],
    estReadMinutes: 4,
    relatedRoutes: ["/open-shifts", "/schedule/coverage"],
  },
  {
    slug: "using-the-ai-assistant",
    title: "Using the AI assistant (⌘K)",
    summary: "The assistant doesn't just answer questions — it can build a schedule, send messages, create roles. What to ask, what it can do.",
    category: "scheduling",
    audience: "manager",
    tags: ["ai", "assistant", "copilot", "automation", "chat"],
    estReadMinutes: 4,
  },

  // Time off ----------------------------------------------------------
  {
    slug: "how-pto-accrual-works",
    title: "How PTO and time-off categories work",
    summary: "Annual lump sum, unlimited, custom categories. What we ship by default and how to tailor it to your business.",
    category: "time-off",
    audience: "manager",
    tags: ["pto", "vacation", "sick", "accrual", "policies"],
    estReadMinutes: 3,
    relatedRoutes: ["/settings/pto"],
  },
  {
    slug: "requesting-time-off",
    title: "Requesting time off",
    summary: "Submit a request from your phone in 30 seconds. What happens after you submit, and how to cancel.",
    category: "time-off",
    audience: "employee",
    tags: ["time off", "vacation", "sick day", "request", "pto"],
    estReadMinutes: 2,
    relatedRoutes: ["/time-off"],
  },
  {
    slug: "approving-time-off",
    title: "Approving (or declining) time-off requests",
    summary: "The decision-in-one-minute workflow, conflict handling, and bulk approval.",
    category: "time-off",
    audience: "manager",
    tags: ["time off", "approve", "decline", "request", "pto"],
    estReadMinutes: 3,
    relatedRoutes: ["/time-off"],
  },
  {
    slug: "time-off-blackouts",
    title: "Setting time-off blackout periods",
    summary: "Black Friday, holidays, peak season — tell us when you don't want to lose people. We warn you instead of blocking.",
    category: "time-off",
    audience: "manager",
    tags: ["blackout", "blackouts", "holiday", "peak", "black friday"],
    estReadMinutes: 2,
    relatedRoutes: ["/settings/time-off-blackouts"],
  },

  // Compliance --------------------------------------------------------
  {
    slug: "fair-workweek-explained",
    title: "Fair Workweek and predictability pay",
    summary: "If you publish a schedule with less than 14 days notice in NYC, Seattle, Oregon, Chicago, Philadelphia, or LA — you may owe extra. Here's what triggers it.",
    category: "compliance",
    audience: "manager",
    tags: ["fair workweek", "predictability pay", "predictive scheduling", "nyc", "seattle", "oregon", "chicago", "philadelphia"],
    estReadMinutes: 4,
    relatedRoutes: ["/compliance"],
  },
  {
    slug: "overtime-and-breaks",
    title: "Overtime and meal breaks",
    summary: "Federal 40-hour rule, daily-overtime states like California, and the wildly different state break requirements.",
    category: "compliance",
    audience: "manager",
    tags: ["overtime", "ot", "breaks", "meal break", "rest break", "flsa", "california"],
    estReadMinutes: 4,
    relatedRoutes: ["/compliance"],
  },
  {
    slug: "state-by-state-labor-laws",
    title: "State-by-state labor law reference",
    summary: "Overtime, meal breaks, rest breaks, predictive scheduling, tip credit, and minimum wage — federal default plus every state with stricter rules.",
    category: "compliance",
    audience: "manager",
    tags: ["state", "labor law", "minimum wage", "tip credit", "california", "new york", "texas", "florida", "washington", "oregon"],
    estReadMinutes: 8,
    relatedRoutes: ["/compliance"],
  },

  // Integrations ------------------------------------------------------
  {
    slug: "connecting-payroll-finch",
    title: "Connecting your payroll (Gusto, ADP, Paychex, and 60+ more)",
    summary: "Stop copy-pasting timesheets at end-of-period. We sync to your payroll system via Finch.",
    category: "integrations",
    audience: "manager",
    tags: ["payroll", "finch", "gusto", "adp", "paychex", "quickbooks", "rippling"],
    estReadMinutes: 3,
    relatedRoutes: ["/settings/integrations"],
  },
  {
    slug: "connecting-your-register-pos",
    title: "Connecting your register (cash register / POS)",
    summary: "Pull in sales so we can show you labor cost as a % of sales in real time — and tell you when to send someone home.",
    category: "integrations",
    audience: "manager",
    tags: ["pos", "register", "sales", "toast", "square", "clover", "labor"],
    estReadMinutes: 3,
    relatedRoutes: ["/settings/pos"],
  },

  // Industry-specific features ---------------------------------------
  {
    slug: "restaurant-tip-pooling",
    title: "Tip pooling for restaurants",
    summary: "Pool types (even / by hours / role-weighted), per-employee entry, POS sync, and auto IRS Form 8027 at year-end.",
    category: "industry",
    audience: "manager",
    tags: ["tips", "tip pool", "restaurant", "irs 8027", "tip out", "server", "bartender"],
    estReadMinutes: 4,
    relatedRoutes: ["/tips"],
  },
  {
    slug: "security-checkpoint-scans",
    title: "Patrol checkpoints for security teams",
    summary: "QR codes around the site, scan from the app, GPS-verified — proof of patrol for your clients and insurance.",
    category: "industry",
    audience: "manager",
    tags: ["security", "patrol", "checkpoint", "qr code", "guard", "scan"],
    estReadMinutes: 3,
    relatedRoutes: ["/settings/checkpoints", "/checkpoints"],
  },
  {
    slug: "healthcare-permits-licences",
    title: "Tracking permits and licenses (RN, BLS, guard cards, etc.)",
    summary: "Per-employee permit tracking with auto-renewal reminders and auto-block on expiry. Required for healthcare, security, field service.",
    category: "industry",
    audience: "manager",
    tags: ["permits", "license", "rn", "lpn", "bls", "cpr", "acls", "guard card", "osha", "forklift"],
    estReadMinutes: 4,
    relatedRoutes: ["/settings/permits", "/hr/members"],
  },
  {
    slug: "construction-safety-briefings",
    title: "Daily safety briefings (toolbox talks) for construction",
    summary: "Pre-built 30-topic library aligned to OSHA's most-cited topics. Crew acknowledges before clocking in. Audit-ready PDF logs.",
    category: "industry",
    audience: "manager",
    tags: ["construction", "safety", "toolbox talk", "briefing", "osha", "jsa", "hazcom", "fall protection"],
    estReadMinutes: 4,
  },

  // For employees -----------------------------------------------------
  {
    slug: "install-mobile-app",
    title: "Installing the ShyftForce app on your phone",
    summary: "Add ShyftForce to your home screen so it works like a regular app — no app store needed.",
    category: "for-employees",
    audience: "employee",
    tags: ["mobile", "install", "pwa", "home screen", "iphone", "android"],
    estReadMinutes: 2,
  },
  {
    slug: "clocking-in-and-out",
    title: "Clocking in and out from your phone",
    summary: "How clock-in works, why it asks for your location, and what to do if it won't let you punch in.",
    category: "for-employees",
    audience: "employee",
    tags: ["clock in", "punch", "gps", "location", "selfie"],
    estReadMinutes: 3,
    relatedRoutes: ["/attendance"],
  },

  // Account & billing -------------------------------------------------
  {
    slug: "changing-your-plan",
    title: "Changing your plan, seats, or cancelling",
    summary: "Upgrade, downgrade, add seats, pause for the off-season, or cancel — all from Settings → Billing. Pro-rated to the day.",
    category: "account",
    audience: "manager",
    tags: ["billing", "plan", "upgrade", "downgrade", "cancel", "seats", "subscription"],
    estReadMinutes: 3,
    relatedRoutes: ["/settings/billing"],
  },
  {
    slug: "two-step-verification",
    title: "Turning on 2-step verification",
    summary: "Add a second password step to keep your account safe. Takes about 2 minutes with any authenticator app.",
    category: "account",
    audience: "all",
    tags: ["2fa", "two factor", "security", "totp", "authenticator"],
    estReadMinutes: 3,
    relatedRoutes: ["/settings/security"],
  },
  {
    slug: "downloading-your-data",
    title: "Downloading or deleting your data",
    summary: "How to export everything we have about you as a single file — and what happens if you delete your account.",
    category: "account",
    audience: "all",
    tags: ["export", "gdpr", "privacy", "delete", "data"],
    estReadMinutes: 2,
    relatedRoutes: ["/settings/security"],
  },

  // Troubleshooting ---------------------------------------------------
  {
    slug: "verification-email-not-arriving",
    title: "My verification email isn't arriving",
    summary: "What to check first, common reasons it goes to spam, and how to ask us to resend it.",
    category: "troubleshooting",
    audience: "all",
    tags: ["email", "verify", "verification", "spam", "signup"],
    estReadMinutes: 2,
  },
  {
    slug: "cant-clock-in",
    title: "I can't clock in — the button is grey or it says I'm too far away",
    summary: "Usually a GPS permission issue or you're outside your clock-in zone. Quick fixes for both.",
    category: "troubleshooting",
    audience: "employee",
    tags: ["clock in", "gps", "location", "permission", "geofence"],
    estReadMinutes: 3,
  },
  {
    slug: "forgot-password",
    title: "I forgot my password",
    summary: "Reset it from the sign-in page — no need to email support. Here's exactly what to do.",
    category: "troubleshooting",
    audience: "all",
    tags: ["password", "reset", "login", "forgot"],
    estReadMinutes: 1,
  },
];

/** Look up by slug. Returns null if not found. */
export function getArticle(slug: string): HelpArticle | null {
  return ARTICLES.find((a) => a.slug === slug) ?? null;
}

/** All articles in a category, in registry order. */
export function articlesInCategory(categorySlug: string): HelpArticle[] {
  return ARTICLES.filter((a) => a.category === categorySlug);
}

/**
 * Cheap client-side search: case-insensitive substring against title +
 * summary + tags. Good enough for ~50 articles; switch to a real index
 * (FlexSearch / FuseJS) when we cross ~200.
 */
export function searchArticles(query: string): HelpArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ARTICLES.filter((a) => {
    const hay = [a.title, a.summary, ...a.tags].join(" ").toLowerCase();
    return q.split(/\s+/).every((term) => hay.includes(term));
  });
}

/**
 * Find an article relevant to the user's current in-app route, so an
 * in-app "help with this page" button can deep-link to the right
 * place. Returns the first match; the registry's order is the tiebreak.
 */
export function articleForRoute(route: string): HelpArticle | null {
  return ARTICLES.find((a) => a.relatedRoutes?.some((r) => route === r || route.startsWith(r + "/"))) ?? null;
}
