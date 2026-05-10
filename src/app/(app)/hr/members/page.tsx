import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel, fmtMoney, initials } from "@/lib/utils";
import { InviteButton } from "@/components/hr/invite-button";

export default async function MembersPage() {
  const u = await requireUser();
  const [members, locations] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: u.organizationId },
      include: { user: true, location: true },
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-ink-500">{members.length} people across {new Set(members.map(m=>m.locationId)).size} locations</p>
        </div>
        {isManager && <InviteButton locations={locations.map(l => ({ id: l.id, name: l.name }))} />}
      </header>

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50/60 text-[11px] uppercase text-ink-600">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Position</th>
              <th className="text-left px-4 py-2.5">Location</th>
              <th className="text-left px-4 py-2.5">Hired</th>
              <th className="text-right px-4 py-2.5">Rate</th>
              <th className="text-center px-4 py-2.5">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-t border-ink-100 hover:bg-ink-50/40">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {m.user.avatar
                      ? <img src={m.user.avatar} className="w-8 h-8 rounded-full" alt="" />
                      : <div className="w-8 h-8 rounded-full bg-ink-200 text-xs font-semibold flex items-center justify-center">{initials(m.user.name)}</div>}
                    <div>
                      <div className="font-medium">{m.user.name}</div>
                      <div className="text-[11px] text-ink-500">{m.user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-ink-700">{m.position ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-700">{m.location?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-600">{dateLabel(m.hireDate)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(m.hourlyRate ?? 0)}/h</td>
                <td className="px-4 py-2.5 text-center">
                  {m.role === "ADMIN" && <span className="badge-orange">Admin</span>}
                  {m.role === "MANAGER" && <span className="badge-blue">Manager</span>}
                  {m.role === "EMPLOYEE" && <span className="badge-gray">Employee</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
