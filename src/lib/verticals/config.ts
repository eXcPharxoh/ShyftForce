// Per-vertical UI configuration. Every page that wants industry-aware behavior
// reads from here. Adding a new vertical is one config block — the sidebar,
// dashboard, and /more page automatically adapt.

import type { ComponentType } from "react";
import {
  Home, Calendar, Clock, Moon, ShoppingBag, Users, FolderClosed, MessageSquare,
  Megaphone, ShieldCheck, ShieldAlert, BarChart3, Receipt, MapPin, Briefcase,
  Activity, Globe, Wallet, TrendingUp, FileWarning, QrCode, Building2, Plug,
  DollarSign, Plane, CalendarX, Repeat, FileBarChart, BookOpen, CreditCard,
  Wrench, FileText, UserCircle, MoreHorizontal, Bell, Webhook, Key, Lock, Tablet,
  GraduationCap, ClipboardCheck, ShieldHalf,
} from "lucide-react";

export type VerticalKey = "grocery" | "security" | "restaurant" | "retail" | "healthcare" | "field_service" | "office" | "fitness" | "default";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  // shown in primary sidebar (top section). Anything not here goes to "More".
  primary?: boolean;
  // hide entirely for this vertical
  hidden?: boolean;
  // role-gating ("manager" = ADMIN+MANAGER only)
  role?: "manager" | "all";
  // promo color for the "killer features" of this vertical
  highlight?: boolean;
};

export type VerticalConfig = {
  key: VerticalKey;
  label: string;
  emoji: string;
  // Sales pitch line — used on landing variants + onboarding
  pitch: string;
  // Module visibility map. Anything not listed defaults to visible-in-more.
  modules: NavItem[];
  // Dashboard top-row widgets (per vertical). Built-in widget keys:
  //   liveLabor | tipsToday | incidentsOpen | checkpointsToday | clientHours
  //   coverageOpen | demandPeak | ewaPending | networkOffers | upcomingShifts
  dashboardWidgets: string[];
  // What replaces the bottom marketing card (currently "Tip Management")
  promoCard: { title: string; subtitle: string; href: string; emoji: string };
};

// --- Module catalog (single source of truth for label/icon/href) ---
const M = {
  dashboard:       { href: "/dashboard",                label: "Home",              icon: Home },
  schedule:        { href: "/schedule",                 label: "Schedule",          icon: Calendar },
  openShifts:      { href: "/open-shifts",              label: "Open Shifts",       icon: ShoppingBag },
  timeOff:         { href: "/time-off",                 label: "Time Off",          icon: Moon },
  attendance:      { href: "/attendance",               label: "Attendance",        icon: Clock },
  expenses:        { href: "/expenses",                 label: "Expenses",          icon: CreditCard },
  hr:              { href: "/hr",                       label: "HR",                icon: Users },
  documents:       { href: "/documents",                label: "Documents",         icon: FolderClosed },
  messenger:       { href: "/messenger",                label: "Messenger",         icon: MessageSquare },
  billboard:       { href: "/billboard",                label: "News Feed",         icon: Megaphone },
  compliance:      { href: "/compliance",               label: "Compliance",        icon: ShieldCheck },
  reports:         { href: "/reports",                  label: "Reports",           icon: BarChart3 },
  coverage:        { href: "/schedule/coverage",        label: "Coverage Center",   icon: ShieldAlert },
  forecast:        { href: "/schedule/forecast",        label: "Demand Forecast",   icon: TrendingUp },
  laborLive:       { href: "/reports/labor-live",       label: "Live Labor",        icon: Activity },
  // Restaurant
  tips:            { href: "/tips",                     label: "Tip Pooling",       icon: Receipt },
  // Security
  incidents:       { href: "/incidents",                label: "Incidents",         icon: FileWarning },
  checkpoints:     { href: "/settings/checkpoints",     label: "Patrol Checkpoints",icon: QrCode },
  clients:         { href: "/clients",                  label: "Client Accounts",   icon: Building2 },
  clientBilling:   { href: "/reports/client-billing",   label: "Client Billing",    icon: FileBarChart },
  // Cross-vertical
  pos:             { href: "/settings/pos",             label: "POS Connections",   icon: Plug },
  ewa:             { href: "/ewa",                      label: "Get paid early",    icon: Wallet },
  ewaSettings:     { href: "/settings/ewa",             label: "EWA settings",      icon: DollarSign },
  workerProfile:   { href: "/worker/profile",           label: "Worker profile",    icon: UserCircle },
  network:         { href: "/network",                  label: "Worker Network",    icon: Globe },
  networkAvail:    { href: "/network/available",        label: "Network shifts",    icon: Globe },
  recurring:       { href: "/settings/recurring-shifts",label: "Recurring patterns",icon: Repeat },
  availability:    { href: "/settings/availability",    label: "My availability",   icon: CalendarX },
  pto:             { href: "/settings/pto",             label: "Time-off policies", icon: Plane },
  billing:         { href: "/settings/billing",         label: "Billing & plan",    icon: CreditCard },
  locations:       { href: "/settings/locations",       label: "Locations",         icon: MapPin },
  integrations:    { href: "/settings/integrations",    label: "Integrations",      icon: Wrench },
  audit:           { href: "/settings/audit",           label: "Audit log",         icon: FileText },
  surveys:         { href: "/hr/surveys",               label: "Survey library",    icon: BookOpen },
  notifications:   { href: "/settings/notifications",   label: "Notifications + language", icon: Bell },
  webhooks:        { href: "/settings/webhooks",        label: "Webhooks",          icon: Webhook },
  apiKeys:         { href: "/settings/api-keys",        label: "API keys",          icon: Key },
  security:        { href: "/settings/security",        label: "Security & 2FA",    icon: Lock },
  kiosks:          { href: "/settings/kiosks",          label: "Kiosk devices",     icon: Tablet },
  training:        { href: "/training",                 label: "Training",          icon: GraduationCap },
  reviews:         { href: "/hr/reviews",               label: "Performance reviews", icon: ClipboardCheck },
  customRoles:     { href: "/settings/custom-roles",    label: "Roles & permissions", icon: ShieldHalf },
} as const;

// --- Vertical configs ---
export const VERTICALS: Record<VerticalKey, VerticalConfig> = {
  grocery: {
    key: "grocery", label: "Grocery / Supermarket", emoji: "🛒",
    pitch: "Department staffing with POS-driven demand and minor-labor protection built in.",
    modules: [
      { ...M.dashboard,   primary: true },
      { ...M.schedule,    primary: true },
      { ...M.forecast,    primary: true, highlight: true, role: "manager" },
      { ...M.laborLive,   primary: true, role: "manager" },
      { ...M.attendance,  primary: true },
      { ...M.openShifts,  primary: true },
      { ...M.timeOff,     primary: true },
      // Hidden — irrelevant to grocery
      { ...M.tips,         hidden: true },
      { ...M.incidents,    hidden: true },
      { ...M.checkpoints,  hidden: true },
      { ...M.clients,      hidden: true },
      { ...M.clientBilling,hidden: true },
      // Secondary (in More)
      { ...M.coverage }, { ...M.compliance }, { ...M.pos }, { ...M.ewa }, { ...M.ewaSettings },
      { ...M.workerProfile }, { ...M.network }, { ...M.networkAvail },
      { ...M.recurring }, { ...M.availability }, { ...M.pto },
      { ...M.hr }, { ...M.documents }, { ...M.messenger }, { ...M.billboard },
      { ...M.reports }, { ...M.expenses }, { ...M.billing },
      { ...M.locations }, { ...M.integrations }, { ...M.audit }, { ...M.surveys },
      { ...M.notifications }, { ...M.security },
      { ...M.training }, { ...M.reviews },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["demandPeak", "laborLive", "coverageOpen", "upcomingShifts"],
    promoCard: { title: "Demand Forecast", subtitle: "AI-predicted staffing from POS history → one-click draft week", href: "/schedule/forecast", emoji: "📈" },
  },

  security: {
    key: "security", label: "Security Services", emoji: "🛡️",
    pitch: "Incident reports, checkpoint tours, and per-client billing — built for guard companies.",
    modules: [
      { ...M.dashboard,    primary: true },
      { ...M.schedule,     primary: true },
      { ...M.incidents,    primary: true, highlight: true },
      { ...M.checkpoints,  primary: true, highlight: true, role: "manager" },
      { ...M.clients,      primary: true, highlight: true, role: "manager" },
      { ...M.attendance,   primary: true },
      { ...M.openShifts,   primary: true },
      { ...M.timeOff,      primary: true },
      // Hidden — irrelevant to security
      { ...M.tips,         hidden: true },
      { ...M.laborLive,    hidden: true },
      { ...M.forecast,     hidden: true },
      { ...M.pos,          hidden: true },
      // Secondary
      { ...M.coverage }, { ...M.compliance }, { ...M.clientBilling },
      { ...M.ewa }, { ...M.ewaSettings }, { ...M.workerProfile },
      { ...M.network }, { ...M.networkAvail },
      { ...M.recurring }, { ...M.availability }, { ...M.pto },
      { ...M.hr }, { ...M.documents }, { ...M.messenger }, { ...M.billboard },
      { ...M.reports }, { ...M.expenses }, { ...M.billing },
      { ...M.locations }, { ...M.integrations }, { ...M.audit }, { ...M.surveys },
      { ...M.notifications }, { ...M.security },
      { ...M.training }, { ...M.reviews },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["incidentsOpen", "checkpointsToday", "clientHours", "coverageOpen"],
    promoCard: { title: "Client Billing", subtitle: "Per-client OT-aware invoicing exported in 2 clicks", href: "/reports/client-billing", emoji: "💼" },
  },

  restaurant: {
    key: "restaurant", label: "Restaurant / Hospitality", emoji: "🍽️",
    pitch: "Tip pools, POS-driven labor%, and demand forecasting purpose-built for service.",
    modules: [
      { ...M.dashboard,   primary: true },
      { ...M.schedule,    primary: true },
      { ...M.tips,        primary: true, highlight: true },
      { ...M.laborLive,   primary: true, highlight: true, role: "manager" },
      { ...M.forecast,    primary: true, highlight: true, role: "manager" },
      { ...M.attendance,  primary: true },
      { ...M.openShifts,  primary: true },
      { ...M.timeOff,     primary: true },
      // Hidden
      { ...M.incidents,    hidden: true },
      { ...M.checkpoints,  hidden: true },
      { ...M.clients,      hidden: true },
      { ...M.clientBilling,hidden: true },
      // Secondary
      { ...M.coverage }, { ...M.compliance }, { ...M.pos },
      { ...M.ewa }, { ...M.ewaSettings }, { ...M.workerProfile },
      { ...M.network }, { ...M.networkAvail },
      { ...M.recurring }, { ...M.availability }, { ...M.pto },
      { ...M.hr }, { ...M.documents }, { ...M.messenger }, { ...M.billboard },
      { ...M.reports }, { ...M.expenses }, { ...M.billing },
      { ...M.locations }, { ...M.integrations }, { ...M.audit }, { ...M.surveys },
      { ...M.notifications }, { ...M.security },
      { ...M.training }, { ...M.reviews },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["laborLive", "tipsToday", "demandPeak", "coverageOpen"],
    promoCard: { title: "Tip Management", subtitle: "Automated, IRS-friendly tip pooling powered by POS data", href: "/tips", emoji: "💰" },
  },

  // Other verticals fall through to a "default" config that shows everything
  retail:        { key: "retail",        label: "Retail",          emoji: "🛍️", pitch: "Foot-traffic-driven scheduling for sales floors.",
    modules: defaultModules(), dashboardWidgets: ["laborLive", "demandPeak", "coverageOpen", "upcomingShifts"],
    promoCard: { title: "Live Labor %", subtitle: "See labor cost vs revenue in real time", href: "/reports/labor-live", emoji: "📊" } },
  healthcare:    { key: "healthcare",    label: "Healthcare",      emoji: "🏥", pitch: "12-hour shifts, license tracking, strict compliance.",
    modules: defaultModules({ hideTips: true, hideClients: true, hideIncidents: true, hideCheckpoints: true }),
    dashboardWidgets: ["coverageOpen", "upcomingShifts", "ewaPending", "networkOffers"],
    promoCard: { title: "Compliance Autopilot", subtitle: "Mandatory breaks + OT + license expiry in one place", href: "/compliance", emoji: "🛡️" } },
  field_service: { key: "field_service", label: "Field Service",   emoji: "🛠️", pitch: "GPS-verified, multi-site coverage for techs and drivers.",
    modules: defaultModules({ hideTips: true, hideIncidents: true, hideCheckpoints: true }),
    dashboardWidgets: ["coverageOpen", "upcomingShifts", "clientHours", "networkOffers"],
    promoCard: { title: "GPS-verified clock-in", subtitle: "Geofences + offline queue + photo check-in", href: "/attendance", emoji: "📍" } },
  office:        { key: "office",        label: "Office",          emoji: "🏢", pitch: "Simple 9-5 scheduling for hybrid teams.",
    modules: defaultModules({ hideTips: true, hideIncidents: true, hideCheckpoints: true, hideClients: true, hidePos: true, hideLaborLive: true, hideForecast: true }),
    dashboardWidgets: ["coverageOpen", "upcomingShifts", "ewaPending", "networkOffers"],
    promoCard: { title: "Worker Network", subtitle: "Tap a cross-employer pool for last-minute cover", href: "/network", emoji: "🌐" } },
  fitness:       { key: "fitness",       label: "Fitness / Wellness", emoji: "💪", pitch: "Class-driven scheduling for trainers + instructors.",
    modules: defaultModules({ hideTips: true, hideIncidents: true, hideCheckpoints: true, hideClients: true }),
    dashboardWidgets: ["upcomingShifts", "coverageOpen", "demandPeak", "ewaPending"],
    promoCard: { title: "Demand Forecast", subtitle: "Class attendance → auto-staff the floor", href: "/schedule/forecast", emoji: "📈" } },
  default:       { key: "default",       label: "Workforce",       emoji: "✨", pitch: "Everything you need to run shift-based work.",
    modules: defaultModules(),
    dashboardWidgets: ["coverageOpen", "upcomingShifts", "networkOffers", "ewaPending"],
    promoCard: { title: "Worker Network", subtitle: "Cross-employer worker pool with reputation that travels", href: "/network", emoji: "🌐" } },
};

function defaultModules(opts: { hideTips?: boolean; hideIncidents?: boolean; hideCheckpoints?: boolean; hideClients?: boolean; hidePos?: boolean; hideLaborLive?: boolean; hideForecast?: boolean } = {}): NavItem[] {
  return [
    { ...M.dashboard,   primary: true },
    { ...M.schedule,    primary: true },
    { ...M.attendance,  primary: true },
    { ...M.openShifts,  primary: true },
    { ...M.timeOff,     primary: true },
    { ...M.tips,         hidden: opts.hideTips },
    { ...M.incidents,    hidden: opts.hideIncidents },
    { ...M.checkpoints,  hidden: opts.hideCheckpoints, role: "manager" },
    { ...M.clients,      hidden: opts.hideClients, role: "manager" },
    { ...M.clientBilling,hidden: opts.hideClients },
    { ...M.laborLive,    hidden: opts.hideLaborLive, role: "manager" },
    { ...M.forecast,     hidden: opts.hideForecast, role: "manager" },
    { ...M.pos,          hidden: opts.hidePos, role: "manager" },
    { ...M.coverage }, { ...M.compliance },
    { ...M.ewa }, { ...M.ewaSettings }, { ...M.workerProfile },
    { ...M.network }, { ...M.networkAvail },
    { ...M.recurring }, { ...M.availability }, { ...M.pto },
    { ...M.hr }, { ...M.documents }, { ...M.messenger }, { ...M.billboard },
    { ...M.reports }, { ...M.expenses }, { ...M.billing },
    { ...M.locations }, { ...M.integrations }, { ...M.audit }, { ...M.surveys },
    { ...M.notifications },
    { ...M.security },
    { ...M.training },
    { ...M.reviews },
    { ...M.webhooks, role: "manager" },
    { ...M.apiKeys, role: "manager" },
    { ...M.kiosks, role: "manager" },
    { ...M.customRoles, role: "manager" },
  ];
}

export function verticalFor(industry: string | null | undefined): VerticalConfig {
  if (!industry) return VERTICALS.default;
  return (VERTICALS as Record<string, VerticalConfig>)[industry] ?? VERTICALS.default;
}

/** Filter modules for the sidebar's primary section, respecting role. */
export function primaryNavFor(industry: string | null | undefined, role: "ADMIN" | "MANAGER" | "EMPLOYEE"): NavItem[] {
  const v = verticalFor(industry);
  return v.modules.filter((m) => m.primary && !m.hidden && (m.role !== "manager" || role !== "EMPLOYEE"));
}

/** Modules NOT in primary nav, used by /more page. Respects role + hidden. */
export function secondaryNavFor(industry: string | null | undefined, role: "ADMIN" | "MANAGER" | "EMPLOYEE"): NavItem[] {
  const v = verticalFor(industry);
  return v.modules.filter((m) => !m.primary && !m.hidden && (m.role !== "manager" || role !== "EMPLOYEE"));
}
