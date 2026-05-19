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
  GraduationCap, ClipboardCheck, ShieldHalf, Ban, ListChecks, Banknote, Target, MapPinned,
  Phone, Truck, LayoutGrid, ScanLine, Trash, Image as ImageIcon, Armchair, Video,
  UserPlus, Dumbbell, UserCheck, HardHat, Bed, Package,
} from "lucide-react";

export type VerticalKey = "grocery" | "security" | "restaurant" | "retail" | "healthcare" | "field_service" | "office" | "fitness" | "construction" | "hospitality" | "education" | "default";

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
  permits:         { href: "/settings/permits",         label: "Permits & licences", icon: ShieldAlert },
  eightySix:       { href: "/eighty-six",               label: "86 list",            icon: Ban },
  checklists:      { href: "/settings/checklists",      label: "Shift checklists",   icon: ListChecks },
  cashDrawer:      { href: "/cash-drawer",              label: "Cash drawer",        icon: Banknote },
  laborTarget:     { href: "/settings/labor-target",    label: "Labor% target",      icon: Target },
  stations:        { href: "/stations",                 label: "Section assignments", icon: MapPinned },
  form8027:        { href: "/reports/form-8027",        label: "IRS Form 8027",       icon: FileBarChart },
  // Healthcare
  patientRatios:   { href: "/settings/patient-ratios",  label: "Patient-staff ratios",icon: Activity },
  differentials:   { href: "/settings/shift-differentials", label: "Shift differentials", icon: Moon },
  onCall:          { href: "/on-call",                  label: "On-call schedule",    icon: Phone },
  // Field service
  vehicles:        { href: "/settings/vehicles",        label: "Fleet vehicles",      icon: Truck },
  jobCloseout:     { href: "/job-closeout",             label: "Job closeout",        icon: ClipboardCheck },
  // Grocery + Retail (shared)
  departments:     { href: "/settings/departments",     label: "Departments",         icon: LayoutGrid },
  // Grocery
  posLanes:        { href: "/settings/pos-lanes",       label: "Cashier lanes",       icon: ScanLine },
  shrink:          { href: "/shrink",                   label: "Shrink log",          icon: Trash },
  // Retail
  vmTasks:         { href: "/vm-tasks",                 label: "Visual merchandising",icon: ImageIcon },
  lossPrevention:  { href: "/loss-prevention",          label: "Loss prevention",     icon: ShieldAlert },
  // Office
  workspace:       { href: "/workspace",                label: "Workspace",           icon: Building2 },
  hotDesksSetup:   { href: "/settings/hot-desks",       label: "Hot desks",           icon: Armchair },
  meetingRoomsSetup: { href: "/settings/meeting-rooms", label: "Meeting rooms",       icon: Video },
  visitors:        { href: "/visitors",                 label: "Visitor log",         icon: UserPlus },
  // Fitness
  classes:         { href: "/classes",                  label: "Class schedule",      icon: Dumbbell },
  classesSetup:    { href: "/settings/fitness-classes", label: "Class templates",     icon: Dumbbell },
  ptSessions:      { href: "/pt-sessions",              label: "Personal training",   icon: UserCheck },
  // Construction
  crewsSetup:      { href: "/settings/crews",           label: "Crews",               icon: HardHat },
  equipment:       { href: "/settings/equipment",       label: "Equipment & tools",   icon: Wrench },
  safety:          { href: "/safety",                   label: "Safety briefings",    icon: HardHat },
  // Hospitality
  rooms:           { href: "/rooms",                    label: "Rooms",               icon: Bed },
  lostFound:       { href: "/lost-found",               label: "Lost & found",        icon: Package },
  // Education
  subPool:         { href: "/settings/sub-pool",        label: "Substitute pool",     icon: GraduationCap },
  periods:         { href: "/settings/class-periods",   label: "Bell schedule",       icon: Clock },
  conferences:     { href: "/conferences",              label: "Parent conferences",  icon: Users },
} as const;

// --- Vertical configs ---
export const VERTICALS: Record<VerticalKey, VerticalConfig> = {
  grocery: {
    key: "grocery", label: "Grocery / Supermarket", emoji: "🛒",
    pitch: "Department staffing, cashier-lane assignments, shrink tracking, POS-driven demand and FLSA minor-labor protection — built for the front-end.",
    modules: [
      { ...M.dashboard,    primary: true },
      { ...M.schedule,     primary: true },
      { ...M.departments,  primary: true, highlight: true, role: "manager" },
      { ...M.posLanes,     primary: true, highlight: true, role: "manager" },
      { ...M.shrink,       primary: true, highlight: true, role: "manager" },
      { ...M.forecast,     primary: true, highlight: true, role: "manager" },
      { ...M.laborLive,    primary: true, role: "manager" },
      { ...M.attendance,   primary: true },
      { ...M.openShifts,   primary: true },
      { ...M.timeOff,      primary: true },
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
      { ...M.permits, role: "manager" },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["shrinkWeek", "laborLive", "coverageOpen", "upcomingShifts"],
    promoCard: { title: "Shrink tracking", subtitle: "Spot loss patterns by department — damage, spoilage, theft", href: "/shrink", emoji: "📊" },
  },

  security: {
    key: "security", label: "Security Services", emoji: "🛡️",
    pitch: "Incident reports, checkpoint tours, permit tracking, and per-client billing — built for guard companies.",
    modules: [
      { ...M.dashboard,    primary: true },
      { ...M.schedule,     primary: true },
      { ...M.permits,      primary: true, highlight: true, role: "manager" },
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
      { ...M.permits, role: "manager" },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["incidentsOpen", "checkpointsToday", "clientHours", "coverageOpen"],
    promoCard: { title: "Client Billing", subtitle: "Per-client OT-aware invoicing exported in 2 clicks", href: "/reports/client-billing", emoji: "💼" },
  },

  restaurant: {
    key: "restaurant", label: "Restaurant / Hospitality", emoji: "🍽️",
    pitch: "Tip pools (with IRS 8027), 86-list, live labor%, side-work checklists, cash drawer + section rotation — built for service.",
    modules: [
      { ...M.dashboard,   primary: true },
      { ...M.schedule,    primary: true },
      { ...M.tips,        primary: true, highlight: true },
      { ...M.eightySix,   primary: true, highlight: true },
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
      { ...M.checklists, role: "manager" },
      { ...M.cashDrawer },
      { ...M.stations },
      { ...M.laborTarget, role: "manager" },
      { ...M.form8027, role: "manager" },
      { ...M.coverage }, { ...M.compliance }, { ...M.pos },
      { ...M.ewa }, { ...M.ewaSettings }, { ...M.workerProfile },
      { ...M.network }, { ...M.networkAvail },
      { ...M.recurring }, { ...M.availability }, { ...M.pto },
      { ...M.hr }, { ...M.documents }, { ...M.messenger }, { ...M.billboard },
      { ...M.reports }, { ...M.expenses }, { ...M.billing },
      { ...M.locations }, { ...M.integrations }, { ...M.audit }, { ...M.surveys },
      { ...M.notifications }, { ...M.security },
      { ...M.training }, { ...M.reviews },
      { ...M.permits, role: "manager" },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["laborLive", "tipsToday", "demandPeak", "coverageOpen"],
    promoCard: { title: "Tip Management", subtitle: "Automated, IRS-friendly tip pooling powered by POS data", href: "/tips", emoji: "💰" },
  },

  // Other verticals fall through to a "default" config that shows everything
  retail: {
    key: "retail", label: "Retail", emoji: "🛍️",
    pitch: "Visual-merch tasks with photo proof, loss-prevention log, department staffing, foot-traffic forecasts — built for sales floors.",
    modules: [
      { ...M.dashboard,       primary: true },
      { ...M.schedule,        primary: true },
      { ...M.vmTasks,         primary: true, highlight: true },
      { ...M.lossPrevention,  primary: true, highlight: true },
      { ...M.departments,     primary: true, highlight: true, role: "manager" },
      { ...M.laborLive,       primary: true, role: "manager" },
      { ...M.forecast,        primary: true, role: "manager" },
      { ...M.attendance,      primary: true },
      { ...M.openShifts,      primary: true },
      { ...M.timeOff,         primary: true },
      // Hidden
      { ...M.tips,         hidden: true },
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
      { ...M.permits, role: "manager" },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["vmTasksOpen", "laborLive", "coverageOpen", "upcomingShifts"],
    promoCard: { title: "Visual merchandising", subtitle: "Photo-proof endcap & display tasks for brand audits", href: "/vm-tasks", emoji: "📸" },
  },
  healthcare: {
    key: "healthcare", label: "Healthcare", emoji: "🏥",
    pitch: "Patient-to-staff ratio enforcement, license/CEU tracking, fair on-call rotation, and night/weekend/holiday differentials — built for nursing.",
    modules: [
      { ...M.dashboard,      primary: true },
      { ...M.schedule,       primary: true },
      { ...M.patientRatios,  primary: true, highlight: true, role: "manager" },
      { ...M.permits,        primary: true, highlight: true, role: "manager" },
      { ...M.onCall,         primary: true, highlight: true },
      { ...M.compliance,     primary: true, highlight: true },
      { ...M.attendance,     primary: true },
      { ...M.openShifts,     primary: true },
      { ...M.timeOff,        primary: true },
      // Hidden
      { ...M.tips,         hidden: true },
      { ...M.incidents,    hidden: true },
      { ...M.checkpoints,  hidden: true },
      { ...M.clients,      hidden: true },
      { ...M.clientBilling,hidden: true },
      // Secondary
      { ...M.differentials, role: "manager" },
      { ...M.coverage }, { ...M.forecast, role: "manager" }, { ...M.laborLive, role: "manager" },
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
    dashboardWidgets: ["onCallToday", "coverageOpen", "upcomingShifts", "ewaPending"],
    promoCard: { title: "Patient ratio guard", subtitle: "Scheduler refuses any assignment that breaches CA Title 22", href: "/settings/patient-ratios", emoji: "🩺" },
  },
  field_service: {
    key: "field_service", label: "Field Service", emoji: "🛠️",
    pitch: "Vehicle assignment + GPS-verified clock-in + skill-tier matching + customer signature closeouts — built for techs and drivers.",
    modules: [
      { ...M.dashboard,      primary: true },
      { ...M.schedule,       primary: true },
      { ...M.vehicles,       primary: true, highlight: true, role: "manager" },
      { ...M.jobCloseout,    primary: true, highlight: true },
      { ...M.permits,        primary: true, highlight: true, role: "manager" },
      { ...M.attendance,     primary: true },
      { ...M.openShifts,     primary: true },
      { ...M.timeOff,        primary: true },
      // Hidden
      { ...M.tips,         hidden: true },
      { ...M.incidents,    hidden: true },
      { ...M.checkpoints,  hidden: true },
      // Secondary
      { ...M.clients, role: "manager" }, { ...M.clientBilling },
      { ...M.differentials, role: "manager" },
      { ...M.coverage }, { ...M.compliance },
      { ...M.forecast, role: "manager" }, { ...M.laborLive, role: "manager" },
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
    dashboardWidgets: ["vehiclesActive", "coverageOpen", "upcomingShifts", "clientHours"],
    promoCard: { title: "Job closeout", subtitle: "Signature + photo + parts cost → CRM webhook in one tap", href: "/job-closeout", emoji: "📋" },
  },
  office: {
    key: "office", label: "Office", emoji: "🏢",
    pitch: "Hot-desk booking, meeting-room reservations, visitor sign-in, and simple 9-to-5 scheduling — built for hybrid teams.",
    modules: [
      { ...M.dashboard,         primary: true },
      { ...M.workspace,         primary: true, highlight: true },
      { ...M.schedule,          primary: true },
      { ...M.visitors,          primary: true, highlight: true },
      { ...M.attendance,        primary: true },
      { ...M.openShifts,        primary: true },
      { ...M.timeOff,           primary: true },
      // Hidden
      { ...M.tips,         hidden: true },
      { ...M.incidents,    hidden: true },
      { ...M.checkpoints,  hidden: true },
      { ...M.clients,      hidden: true },
      { ...M.clientBilling,hidden: true },
      { ...M.pos,          hidden: true },
      { ...M.laborLive,    hidden: true },
      { ...M.forecast,     hidden: true },
      // Setup (in More)
      { ...M.hotDesksSetup, role: "manager" },
      { ...M.meetingRoomsSetup, role: "manager" },
      // Secondary
      { ...M.coverage }, { ...M.compliance },
      { ...M.ewa }, { ...M.ewaSettings }, { ...M.workerProfile },
      { ...M.network }, { ...M.networkAvail },
      { ...M.recurring }, { ...M.availability }, { ...M.pto },
      { ...M.hr }, { ...M.documents }, { ...M.messenger }, { ...M.billboard },
      { ...M.reports }, { ...M.expenses }, { ...M.billing },
      { ...M.locations }, { ...M.integrations }, { ...M.audit }, { ...M.surveys },
      { ...M.notifications }, { ...M.security },
      { ...M.training }, { ...M.reviews },
      { ...M.permits, role: "manager" },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["coverageOpen", "upcomingShifts", "ewaPending", "networkOffers"],
    promoCard: { title: "Workspace booking", subtitle: "Hot-desks + meeting rooms in one tap", href: "/workspace", emoji: "🪑" },
  },
  fitness: {
    key: "fitness", label: "Fitness / Wellness", emoji: "💪",
    pitch: "Group-class schedule with per-occurrence instructor assignment, personal-training bookings with trainer-split payout, certification tracking — built for studios.",
    modules: [
      { ...M.dashboard,    primary: true },
      { ...M.classes,      primary: true, highlight: true },
      { ...M.ptSessions,   primary: true, highlight: true },
      { ...M.schedule,     primary: true },
      { ...M.permits,      primary: true, highlight: true, role: "manager" },
      { ...M.attendance,   primary: true },
      { ...M.openShifts,   primary: true },
      { ...M.timeOff,      primary: true },
      // Hidden
      { ...M.tips,         hidden: true },
      { ...M.incidents,    hidden: true },
      { ...M.checkpoints,  hidden: true },
      { ...M.clients,      hidden: true },
      { ...M.clientBilling,hidden: true },
      // Setup (in More)
      { ...M.classesSetup, role: "manager" },
      // Secondary
      { ...M.coverage }, { ...M.compliance },
      { ...M.forecast, role: "manager" }, { ...M.laborLive, role: "manager" }, { ...M.pos, role: "manager" },
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
    dashboardWidgets: ["classesToday", "upcomingShifts", "coverageOpen", "ewaPending"],
    promoCard: { title: "Class schedule", subtitle: "Assign instructors + track attendance + auto-rotate", href: "/classes", emoji: "🧘" },
  },
  construction: {
    key: "construction", label: "Construction", emoji: "🏗️",
    pitch: "Crews + foremen, equipment tracking, daily safety stand-ups with ack tracking, OSHA-grade documentation — built for the trades.",
    modules: [
      { ...M.dashboard,    primary: true },
      { ...M.schedule,     primary: true },
      { ...M.crewsSetup,   primary: true, highlight: true, role: "manager" },
      { ...M.safety,       primary: true, highlight: true },
      { ...M.equipment,    primary: true, highlight: true, role: "manager" },
      { ...M.permits,      primary: true, role: "manager" },
      { ...M.attendance,   primary: true },
      { ...M.openShifts,   primary: true },
      { ...M.timeOff,      primary: true },
      // Hidden
      { ...M.tips,         hidden: true },
      { ...M.incidents,    hidden: true },
      { ...M.checkpoints,  hidden: true },
      { ...M.clients,      hidden: true },
      { ...M.clientBilling,hidden: true },
      { ...M.pos,          hidden: true },
      // Secondary
      { ...M.coverage }, { ...M.compliance },
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
    dashboardWidgets: ["safetyAcks", "coverageOpen", "upcomingShifts", "ewaPending"],
    promoCard: { title: "Daily safety briefings", subtitle: "Crew acks tracked + 7-day compliance % at a glance", href: "/safety", emoji: "🏗️" },
  },
  hospitality: {
    key: "hospitality", label: "Hospitality / Hotel", emoji: "🏨",
    pitch: "Room status board, housekeeping assignments, lost & found log, Manager-on-Duty tracking — built for hotels and resorts.",
    modules: [
      { ...M.dashboard,    primary: true },
      { ...M.rooms,        primary: true, highlight: true },
      { ...M.schedule,     primary: true },
      { ...M.lostFound,    primary: true, highlight: true },
      { ...M.attendance,   primary: true },
      { ...M.openShifts,   primary: true },
      { ...M.timeOff,      primary: true },
      // Hidden
      { ...M.tips,         hidden: true },
      { ...M.incidents,    hidden: true },
      { ...M.checkpoints,  hidden: true },
      { ...M.clients,      hidden: true },
      { ...M.clientBilling,hidden: true },
      // Secondary
      { ...M.coverage }, { ...M.compliance }, { ...M.checklists, role: "manager" },
      { ...M.forecast, role: "manager" }, { ...M.laborLive, role: "manager" }, { ...M.pos, role: "manager" },
      { ...M.ewa }, { ...M.ewaSettings }, { ...M.workerProfile },
      { ...M.network }, { ...M.networkAvail },
      { ...M.recurring }, { ...M.availability }, { ...M.pto },
      { ...M.hr }, { ...M.documents }, { ...M.messenger }, { ...M.billboard },
      { ...M.reports }, { ...M.expenses }, { ...M.billing },
      { ...M.locations }, { ...M.integrations }, { ...M.audit }, { ...M.surveys },
      { ...M.notifications }, { ...M.security },
      { ...M.training }, { ...M.reviews },
      { ...M.permits, role: "manager" },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["roomStatus", "lostFound", "coverageOpen", "upcomingShifts"],
    promoCard: { title: "Live room board", subtitle: "Dirty → cleaning → clean in one tap, with housekeeper trail", href: "/rooms", emoji: "🛏️" },
  },
  education: {
    key: "education", label: "Education / School", emoji: "🎓",
    pitch: "Bell-schedule-aware shifts, substitute teacher pool with first-respond-wins texts, parent-teacher conference booking — built for K-12.",
    modules: [
      { ...M.dashboard,    primary: true },
      { ...M.schedule,     primary: true },
      { ...M.subPool,      primary: true, highlight: true, role: "manager" },
      { ...M.periods,      primary: true, highlight: true, role: "manager" },
      { ...M.conferences,  primary: true, highlight: true },
      { ...M.attendance,   primary: true },
      { ...M.openShifts,   primary: true },
      { ...M.timeOff,      primary: true },
      // Hidden
      { ...M.tips,         hidden: true },
      { ...M.incidents,    hidden: true },
      { ...M.checkpoints,  hidden: true },
      { ...M.clients,      hidden: true },
      { ...M.clientBilling,hidden: true },
      { ...M.pos,          hidden: true },
      { ...M.laborLive,    hidden: true },
      { ...M.forecast,     hidden: true },
      // Secondary
      { ...M.coverage }, { ...M.compliance },
      { ...M.ewa }, { ...M.ewaSettings }, { ...M.workerProfile },
      { ...M.network }, { ...M.networkAvail },
      { ...M.recurring }, { ...M.availability }, { ...M.pto },
      { ...M.hr }, { ...M.documents }, { ...M.messenger }, { ...M.billboard },
      { ...M.reports }, { ...M.expenses }, { ...M.billing },
      { ...M.locations }, { ...M.integrations }, { ...M.audit }, { ...M.surveys },
      { ...M.notifications }, { ...M.security },
      { ...M.training }, { ...M.reviews },
      { ...M.permits, role: "manager" },
      { ...M.webhooks, role: "manager" },
      { ...M.apiKeys, role: "manager" }, { ...M.kiosks, role: "manager" },
      { ...M.customRoles, role: "manager" },
    ],
    dashboardWidgets: ["coverageOpen", "upcomingShifts", "ewaPending", "networkOffers"],
    promoCard: { title: "Substitute pool", subtitle: "Auto-text matched subs when a teacher calls out, first-claim-wins", href: "/settings/sub-pool", emoji: "🎓" },
  },
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
    { ...M.permits, role: "manager" },
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
