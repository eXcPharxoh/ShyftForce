import Link from "next/link";
import { requireUser } from "@/lib/session";
import { secondaryNavFor, verticalFor } from "@/lib/verticals/config";

export default async function MorePage() {
  const u = await requireUser();
  const vertical = verticalFor(u.organizationIndustry);
  const items = secondaryNavFor(u.organizationIndustry, u.role);

  // Group items by rough category for visual scanning
  const groups: { label: string; items: typeof items }[] = [
    {
      label: "Money & retention",
      items: items.filter((m) => ["/ewa", "/settings/ewa", "/reports/labor-live", "/settings/pos", "/reports/client-billing"].includes(m.href)),
    },
    {
      label: "Schedule & coverage",
      items: items.filter((m) => ["/schedule/coverage", "/schedule/forecast", "/settings/recurring-shifts", "/settings/availability"].includes(m.href)),
    },
    {
      label: "Network",
      items: items.filter((m) => ["/worker/profile", "/network", "/network/available"].includes(m.href)),
    },
    {
      label: "People & policy",
      items: items.filter((m) => ["/hr", "/documents", "/messenger", "/billboard", "/settings/pto", "/compliance", "/hr/surveys"].includes(m.href)),
    },
    {
      label: "Reporting",
      items: items.filter((m) => ["/reports", "/expenses"].includes(m.href)),
    },
    {
      label: "Workspace",
      items: items.filter((m) => ["/settings/billing", "/settings/locations", "/settings/integrations", "/settings/audit"].includes(m.href)),
    },
  ];
  const placed = new Set(groups.flatMap((g) => g.items.map((i) => i.href)));
  const other = items.filter((m) => !placed.has(m.href));
  if (other.length > 0) groups.push({ label: "Other", items: other });

  return (
    <div className="space-y-5">
      <header>
        <div className="text-[11px] uppercase tracking-wider font-bold text-ink-400 mb-1 flex items-center gap-1.5">
          <span>{vertical.emoji}</span> {vertical.label} workspace
        </div>
        <h1 className="text-2xl font-bold tracking-tight">More</h1>
        <p className="text-sm text-ink-500">{vertical.pitch}</p>
      </header>

      {groups.filter((g) => g.items.length > 0).map((g) => (
        <section key={g.label}>
          <h2 className="text-[11px] uppercase tracking-wider font-bold text-ink-500 dark:text-ink-400 mb-2">{g.label}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {g.items.map(({ href, label, icon: Icon, highlight }) => (
              <Link key={href} href={href} className={`card card-hover p-4 flex items-center gap-3 ${highlight ? "ring-1 ring-rose-200 dark:ring-rose-500/20" : ""}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${highlight ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300"}`}>
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
