import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TipPoolEditor } from "@/components/tips/editor";
import { Wallet, DollarSign } from "lucide-react";
import { dateLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TipsPage() {
  const u = await requireManagerOrAdmin();
  const [pools, locations] = await Promise.all([
    prisma.tipPool.findMany({
      where: { organizationId: u.organizationId },
      include: {
        location: true,
        distributions: { include: { member: { include: { user: true } } }, orderBy: { amountCents: "desc" } },
      },
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  const totalDistributedThisMonth = pools
    .filter((p) => +p.date >= +new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    .reduce((a, p) => a + p.totalTipsCents, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Restaurant"
        icon={Wallet}
        title="Tip pooling"
        subtitle={`${pools.length} pool${pools.length === 1 ? "" : "s"} logged · $${(totalDistributedThisMonth / 100).toFixed(0)} distributed this month`}
      />

      <section className="card p-5">
        <h3 className="text-sm font-bold mb-3">Log + distribute a tip pool</h3>
        <TipPoolEditor locations={locations.map(l => ({ id: l.id, name: l.name }))} />
        <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-3">
          Tip data is auditable + exportable for IRS compliance. Distribution is calculated from the people who worked that day at the location.
          Hours-weighted is the most common; role-weighted gives bigger cuts to servers/bartenders vs support roles.
        </p>
      </section>

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
          <h3 className="text-sm font-semibold">Recent pools</h3>
        </header>
        {pools.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-500 dark:text-ink-400">
            No tip pools logged yet.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {pools.map((p) => (
              <li key={p.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">
                      {p.location.name} · {dateLabel(p.date)}
                      <span className={`ml-2 ${p.status === "finalized" ? "badge-green" : "badge-amber"}`}>{p.status}</span>
                    </div>
                    <div className="text-[11px] text-ink-500 dark:text-ink-400">
                      ${(p.totalTipsCents / 100).toFixed(2)} · {p.distributionRule.replace(/_/g, " ")} · {p.distributions.length} contributors
                    </div>
                  </div>
                </div>
                {p.distributions.length > 0 && (
                  <ul className="mt-2 ml-13 text-xs space-y-0.5">
                    {p.distributions.slice(0, 6).map((d) => (
                      <li key={d.id} className="flex items-center gap-2">
                        <span className="font-medium">{d.member.user.name}</span>
                        <span className="text-ink-500">· {d.hoursWorked.toFixed(1)}h</span>
                        <span className="ml-auto tabular-nums font-semibold">${(d.amountCents / 100).toFixed(2)}</span>
                      </li>
                    ))}
                    {p.distributions.length > 6 && (
                      <li className="text-ink-500 text-[10px]">+ {p.distributions.length - 6} more</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
