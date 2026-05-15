import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { relTime } from "@/lib/utils";
import { Search, Building2 } from "lucide-react";
import { CreateOrgDialog } from "@/components/platform/create-org-dialog";

export const dynamic = "force-dynamic";

export default async function PlatformOrgsPage({ searchParams }: { searchParams: Promise<{ q?: string; plan?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const plan = sp.plan ?? "";

  const where: any = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }];
  if (plan) where.plan = plan;

  const orgs = await prisma.organization.findMany({
    where,
    include: {
      members: { select: { id: true } },
      locations: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-ink-500">{orgs.length} shown · use filters to narrow</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <form className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input name="q" defaultValue={q} placeholder="Search name or slug" className="input h-9 pl-8 w-64 text-sm" />
            </div>
            <select name="plan" defaultValue={plan} className="input h-9 text-sm w-32">
              <option value="">All plans</option>
              <option value="trial">Trial</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button className="btn-outline h-9 text-xs">Filter</button>
          </form>
          <CreateOrgDialog />
        </div>
      </header>

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 dark:bg-ink-900 text-[11px] uppercase font-bold tracking-wider text-ink-500">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Industry</th>
              <th className="text-left px-4 py-2.5">Plan</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-right px-4 py-2.5">Members</th>
              <th className="text-right px-4 py-2.5">Locations</th>
              <th className="text-right px-4 py-2.5">Created</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-t border-ink-100 dark:border-ink-800 hover:bg-ink-50/40 dark:hover:bg-ink-800/40">
                <td className="px-4 py-2.5">
                  <Link href={`/platform/orgs/${o.id}`} className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs shrink-0">{(o.name[0] ?? "?").toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="font-semibold group-hover:text-brand-600 truncate">{o.name}</div>
                      <div className="text-[11px] text-ink-500 truncate">{o.slug}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-ink-700 dark:text-ink-300">{o.industry ?? "—"}</td>
                <td className="px-4 py-2.5"><PlanBadge plan={o.plan} /></td>
                <td className="px-4 py-2.5"><StatusBadge status={o.subscriptionStatus} /></td>
                <td className="px-4 py-2.5 text-right tabular-nums">{o.members.length}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{o.locations.length}</td>
                <td className="px-4 py-2.5 text-right text-[11px] text-ink-500">{relTime(o.createdAt)}</td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-ink-500 text-sm">No organizations match.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const cls = plan === "pro" ? "badge bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
            : plan === "starter" ? "badge-gray"
            : plan === "trial" ? "badge-amber"
            : "badge-green";
  return <span className={cls}>{plan}</span>;
}
function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="badge-gray">—</span>;
  if (status === "active") return <span className="badge-green">active</span>;
  if (status === "past_due") return <span className="badge-red">past due</span>;
  if (status === "canceled") return <span className="badge-gray">canceled</span>;
  return <span className="badge-gray">{status}</span>;
}
