import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { relTime } from "@/lib/utils";
import { ImpersonateButton } from "@/components/platform/impersonate-button";
import { UserActionsMenu } from "@/components/platform/user-actions-menu";
import { Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlatformUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const where: any = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name:  { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: { member: { include: { organization: { select: { id: true, name: true, plan: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-ink-500">Search by email or name · {users.length} shown</p>
        </div>
        <form className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" defaultValue={q} placeholder="email@…" className="input h-9 pl-8 w-72 text-sm" />
          </div>
          <button className="btn-outline h-9 text-xs">Search</button>
        </form>
      </header>

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 dark:bg-ink-900 text-[11px] uppercase font-bold tracking-wider text-ink-500">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Email</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Organization</th>
              <th className="text-right px-4 py-2.5">Signed up</th>
              <th className="text-right px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const locked = u.lockedUntil && u.lockedUntil > new Date();
              return (
                <tr key={u.id} className="border-t border-ink-100 dark:border-ink-800 hover:bg-ink-50/40 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 font-medium">{u.name}</td>
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-300 font-mono text-[12px]">{u.email}</td>
                  <td className="px-4 py-2.5 text-[11px]">
                    {locked
                      ? <span className="badge-red flex items-center gap-1"><XCircle className="w-3 h-3" /> locked</span>
                      : u.emailVerified
                        ? <span className="badge-green flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> verified</span>
                        : <span className="badge-amber flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> unverified</span>}
                    {u.failedLoginAttempts > 0 && <span className="ml-1 text-rose-600">{u.failedLoginAttempts} failed</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.member?.organization ? (
                      <Link href={`/platform/orgs/${u.member.organization.id}`} className="text-ink-700 hover:text-brand-600">
                        {u.member.organization.name} <span className="text-ink-400 text-[10px]">· {u.member.role}</span>
                      </Link>
                    ) : <span className="text-ink-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[11px] text-ink-500">{relTime(u.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {u.member && <ImpersonateButton userId={u.id} email={u.email} name={u.name} />}
                      <UserActionsMenu
                        userId={u.id}
                        email={u.email}
                        name={u.name}
                        locked={!!locked}
                        verified={!!u.emailVerified}
                        role={u.member?.role as any}
                        status={u.member?.status as any}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-500">{q ? "No users match." : "Type to search."}</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
