import Link from "next/link";
import { Activity, Award, Bell, BookOpen, BrainCircuit, Building2, CalendarX, ClipboardCheck, CreditCard, DollarSign, FileBarChart, FileText, Gift, Globe, KeyRound, Plane, Plug, QrCode, Receipt, Repeat, Settings, ShieldAlert, ShieldCheck, TrendingUp, UserCircle, Wallet, Wrench } from "lucide-react";

const ITEMS = [
  // Vertical workflows
  { href: "/incidents",                 label: "Incident reports",      icon: ShieldAlert },
  { href: "/checkpoints/scan",          label: "Scan checkpoint",       icon: QrCode },
  { href: "/settings/checkpoints",      label: "Patrol checkpoints",    icon: ClipboardCheck },
  { href: "/clients",                   label: "Clients (billing)",     icon: Building2 },
  { href: "/reports/client-billing",    label: "Client billing report", icon: DollarSign },
  { href: "/tips",                      label: "Tip pooling",           icon: Wallet },
  // Core
  { href: "/settings/billing",          label: "Billing & plan",        icon: CreditCard },
  { href: "/settings/locations",        label: "Locations & geofences", icon: Building2 },
  { href: "/settings/pto",              label: "Time-off policies",     icon: Plane },
  { href: "/settings/recurring-shifts", label: "Recurring patterns",    icon: Repeat },
  { href: "/settings/availability",     label: "My availability",       icon: CalendarX },
  { href: "/schedule/coverage",         label: "Coverage Center",       icon: ShieldAlert },
  { href: "/schedule/forecast",         label: "Demand Forecast",       icon: TrendingUp },
  { href: "/reports/labor-live",        label: "Live Labor",            icon: Activity },
  { href: "/settings/pos",              label: "POS connections",       icon: Plug },
  { href: "/ewa",                       label: "Get paid early",        icon: Wallet },
  { href: "/settings/ewa",              label: "EWA settings",          icon: DollarSign },
  { href: "/worker/profile",            label: "Worker profile",        icon: UserCircle },
  { href: "/network",                   label: "Worker Network",        icon: Globe },
  { href: "/network/available",         label: "Network shifts (mine)", icon: Globe },
  { href: "/settings/integrations",     label: "Integrations",          icon: Wrench },
  { href: "/settings/audit",            label: "Audit log",             icon: FileText },
  { href: "/reports",                   label: "Advanced reports",      icon: FileBarChart },
  { href: "/hr/surveys",                label: "Survey library",        icon: BookOpen },
  { href: "/compliance",                label: "Compliance Autopilot",  icon: ShieldCheck },
  { href: "#", label: "Permissions & roles",   icon: ShieldCheck },
  { href: "#", label: "Notification rules",    icon: Bell },
  { href: "#", label: "API keys",              icon: KeyRound },
  { href: "#", label: "Referral program",      icon: Gift },
];

export default function MorePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">More</h1>
        <p className="text-sm text-ink-500">Extras, settings, and integrations.</p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={label} href={href} className="card card-hover p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink-100 text-ink-700 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div className="font-medium text-sm">{label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
