import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dateLabel, fmtMoney, initials } from "@/lib/utils";
import { InviteButton } from "@/components/hr/invite-button";
import { ImportCsvButton } from "@/components/hr/import-csv-button";
import { ExportButton } from "@/components/reports/export-button";
import { PageHeader } from "@/components/ui/page-header";
import { Users } from "lucide-react";
import Link from "next/link";

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
      <PageHeader
        eyebrow="Team"
        icon={Users}
        title="Members"
        subtitle={`${members.length} ${members.length === 1 ? "person" : "people"} across ${new Set(members.map(m=>m.locationId)).size} location${new Set(members.map(m=>m.locationId)).size === 1 ? "" : "s"}`}
      >
        {isManager && <ExportButton type="members" label="Members CSV" />}
        {isManager && <ImportCsvButton locations={locations.map(l => ({ id: l.id, name: l.name }))} />}
        {isManager && <InviteButton locations={locations.map(l => ({ id: l.id, name: l.name }))} />}
      </PageHeader>

      <section className="card overflow-hidden">
        {/* overflow-x-auto on the wrapper so the table scrolls horizontally on
            narrow viewports instead of overflowing the page. min-w-[560px] on
            the table keeps the columns from collapsing into mush. */}
        <div className="overflow-x-auto">
        <table className="t-modern min-w-[560px]">
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th className="hidden sm:table-cell">Location</th>
              <th className="hidden md:table-cell">Hired</th>
              <th className="text-right">Rate</th>
              <th className="text-center">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="group">
                <td>
                  <Link href={`/hr/members/${m.id}`} className="flex items-center gap-2.5">
                    {m.user.avatar
                      ? <img src={m.user.avatar} className="w-8 h-8 rounded-full" alt="" />
                      : <div
                          className="w-8 h-8 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, #a78bff, #3a6fd8)" }}
                        >{initials(m.user.name)}</div>}
                    <div className="min-w-0">
                      <div className="font-semibold text-ink-50 group-hover:text-brand-300 transition truncate">{m.user.name}</div>
                      <div className="text-[11px] text-ink-500 truncate">{m.user.email}</div>
                    </div>
                  </Link>
                </td>
                <td className="text-ink-300">{m.position ?? "—"}</td>
                <td className="text-ink-300 hidden sm:table-cell">{m.location?.name ?? "—"}</td>
                <td className="text-ink-400 hidden md:table-cell">{dateLabel(m.hireDate)}</td>
                <td className="text-right tabular-nums text-ink-50 font-medium">{fmtMoney(m.hourlyRate ?? 0)}/h</td>
                <td className="text-center">
                  {m.role === "ADMIN" && <span className="badge-orange">Admin</span>}
                  {m.role === "MANAGER" && <span className="badge-blue">Manager</span>}
                  {m.role === "EMPLOYEE" && <span className="badge-gray">Employee</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
