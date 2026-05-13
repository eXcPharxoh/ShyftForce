import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { relTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PlatformAuditPage({ searchParams }: { searchParams: Promise<{ action?: string; org?: string }> }) {
  const sp = await searchParams;
  const where: any = {};
  if (sp.action) where.action = sp.action;
  if (sp.org)    where.organizationId = sp.org;

  const events = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { email: true, name: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  // Distinct actions for filter pill
  const allActions = await prisma.auditLog.findMany({
    distinct: ["action"], select: { action: true }, take: 50,
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Global audit log</h1>
        <p className="text-sm text-ink-500">Every mutation across every org · last 200 events</p>
      </header>

      <form className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-ink-500 font-semibold uppercase tracking-wider">Filter:</span>
        <select name="action" defaultValue={sp.action ?? ""} className="input h-8 text-xs w-56">
          <option value="">All actions</option>
          {allActions.map((a) => <option key={a.action} value={a.action}>{a.action}</option>)}
        </select>
        <input name="org" defaultValue={sp.org ?? ""} placeholder="org id" className="input h-8 text-xs w-44 font-mono" />
        <button className="btn-outline h-8 text-xs">Apply</button>
      </form>

      <section className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 dark:bg-ink-900 text-[10px] uppercase font-bold tracking-wider text-ink-500">
            <tr>
              <th className="text-left px-4 py-2">Action</th>
              <th className="text-left px-4 py-2">Actor</th>
              <th className="text-left px-4 py-2">Org</th>
              <th className="text-left px-4 py-2">Entity</th>
              <th className="text-left px-4 py-2">Metadata</th>
              <th className="text-right px-4 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-ink-100 dark:border-ink-800">
                <td className="px-4 py-1.5"><span className="badge-gray font-mono">{e.action}</span></td>
                <td className="px-4 py-1.5">{e.actor?.email ?? <span className="text-ink-400">system</span>}</td>
                <td className="px-4 py-1.5">
                  <Link href={`/platform/orgs/${e.organizationId}`} className="hover:text-brand-600">{e.organization.name}</Link>
                </td>
                <td className="px-4 py-1.5 text-ink-500">{e.entityType ?? "—"} {e.entityId ? <span className="font-mono text-ink-400">{e.entityId.slice(0, 8)}</span> : null}</td>
                <td className="px-4 py-1.5 text-ink-500 max-w-[280px] truncate font-mono text-[10px]">{e.metadata ?? ""}</td>
                <td className="px-4 py-1.5 text-right text-[11px] text-ink-500">{relTime(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
