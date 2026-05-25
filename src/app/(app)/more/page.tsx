import Link from "next/link";
import { requireUser } from "@/lib/session";
import { moreNavFor, verticalFor } from "@/lib/verticals/config";

export default async function MorePage() {
  const u = await requireUser();
  const vertical = verticalFor(u.organizationIndustry);
  const items = moreNavFor(u.organizationIndustry, u.role);

  // Plain-language groups, ordered by how often a typical business reaches for
  // them. Everything the app can do (minus the pinned core) lives here, so
  // /more is the complete, scannable directory.
  const groups: { label: string; items: typeof items }[] = [
    {
      label: "Scheduling",
      items: items.filter((m) => [
        "/open-shifts", "/schedule/coverage", "/schedule/forecast",
        "/settings/recurring-shifts", "/settings/availability",
        "/settings/pto", "/settings/time-off-blackouts",
      ].includes(m.href)),
    },
    {
      label: "Your team",
      items: items.filter((m) => [
        "/hr", "/hr/jobs", "/hr/reviews", "/hr/surveys", "/log-book",
        "/documents", "/messenger", "/billboard", "/training",
      ].includes(m.href)),
    },
    {
      label: `${vertical.label} tools`,
      items: items.filter((m) => [
        // restaurant
        "/tips", "/eighty-six", "/cash-drawer", "/stations", "/settings/checklists", "/settings/labor-target",
        // grocery / retail
        "/settings/departments", "/settings/pos-lanes", "/shrink", "/vm-tasks", "/loss-prevention",
        // office
        "/workspace", "/visitors", "/settings/hot-desks", "/settings/meeting-rooms",
        // fitness
        "/classes", "/pt-sessions", "/settings/fitness-classes",
        // construction
        "/safety", "/settings/crews", "/settings/equipment",
        // hospitality
        "/rooms", "/lost-found",
        // education
        "/sub-callout", "/settings/sub-pool", "/settings/class-periods", "/conferences",
        // healthcare
        "/settings/patient-ratios", "/settings/shift-differentials", "/on-call",
        // field service
        "/settings/vehicles", "/job-closeout",
        // security
        "/incidents", "/clients", "/settings/checkpoints",
      ].includes(m.href)),
    },
    {
      label: "Pay & money",
      items: items.filter((m) => [
        "/ewa", "/settings/ewa", "/tips", "/expenses",
        "/reports/client-billing", "/reports/labor-live", "/settings/pos", "/reports/form-8027",
      ].includes(m.href)),
    },
    {
      label: "Worker network",
      items: items.filter((m) => ["/worker/profile", "/network", "/network/available"].includes(m.href)),
    },
    {
      label: "Reports",
      items: items.filter((m) => [
        "/reports", "/reports/shrink", "/reports/room-turn-time", "/reports/safety-acks",
        "/reports/class-attendance", "/reports/pt-payout", "/reports/vm-completion",
      ].includes(m.href)),
    },
    {
      label: "Settings",
      items: items.filter((m) => [
        "/compliance", "/settings/billing", "/settings/locations", "/settings/integrations",
        "/settings/audit", "/settings/notifications", "/settings/security", "/settings/permits",
        "/settings/webhooks", "/settings/api-keys", "/settings/kiosks", "/settings/custom-roles",
      ].includes(m.href)),
    },
  ];
  // Anything not explicitly mapped still shows up, so nothing ever disappears.
  const placed = new Set(groups.flatMap((g) => g.items.map((i) => i.href)));
  const other = items.filter((m) => !placed.has(m.href));
  if (other.length > 0) groups.push({ label: "More tools", items: other });

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-wider font-bold text-ink-400 mb-1 flex items-center gap-1.5">
          <span>{vertical.emoji}</span> {vertical.label} workspace
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Everything else</h1>
        <p className="text-sm text-ink-500">Every tool in your workspace, organized. Your day-to-day lives in the sidebar — this is the full toolbox.</p>
      </header>

      {groups.filter((g) => g.items.length > 0).map((g) => (
        <section key={g.label}>
          <h2 className="text-[11px] uppercase tracking-wider font-bold text-ink-500 dark:text-ink-400 mb-2">{g.label}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {g.items.map(({ href, label, icon: Icon, highlight }) => (
              <Link key={href} href={href} className={`card card-hover p-4 flex items-center gap-3 ${highlight ? "ring-1 ring-brand-500/25" : ""}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${highlight ? "bg-brand-500/15 text-brand-300" : "bg-white/[0.04] text-ink-300"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-medium text-sm">{label}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
