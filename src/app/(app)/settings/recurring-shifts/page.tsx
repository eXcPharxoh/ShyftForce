import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RecurringShiftEditor } from "@/components/schedule/recurring-shift-editor";
import { Repeat } from "lucide-react";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function RecurringShiftsPage() {
  const u = await requireManagerOrAdmin();
  const [items, members, locations] = await Promise.all([
    prisma.recurringShift.findMany({
      where: { member: { organizationId: u.organizationId } },
      include: { member: { include: { user: true } } },
      orderBy: [{ active: "desc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active", role: { not: "ADMIN" } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);
  const locById = new Map(locations.map(l => [l.id, l.name]));

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow="Scheduling"
        icon={Repeat}
        title="Recurring shift patterns"
        subtitle="Save 'Sarah works Mon-Fri 9-5' once. Apply to any week with one click."
      >
        <RecurringShiftEditor
          mode="create"
          members={members.map(m => ({ id: m.id, name: m.user.name, position: m.position }))}
          locations={locations.map(l => ({ id: l.id, name: l.name }))}
        />
      </PageHeader>

      <section className="card overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={Repeat}
            tone="brand"
            title="No recurring patterns yet"
            description="Add one for an employee who has a regular weekly shift. Then apply it to any week from the Schedule page."
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-ink-50/60 dark:bg-ink-800/60 text-[11px] uppercase font-semibold tracking-wider text-ink-500 dark:text-ink-400">
              <tr>
                <th className="text-left px-4 py-2.5">Member</th>
                <th className="text-left px-4 py-2.5">Day</th>
                <th className="text-left px-4 py-2.5">Time</th>
                <th className="text-left px-4 py-2.5 hidden md:table-cell">Location · Position</th>
                <th className="text-left px-4 py-2.5 hidden lg:table-cell">Effective</th>
                <th className="text-center px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id} className="border-t border-ink-100 dark:border-ink-800 hover:bg-ink-50/40 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 font-medium text-ink-900 dark:text-ink-100">{r.member.user.name}</td>
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-300">{DOW[r.dayOfWeek]}</td>
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-300 tabular-nums">{r.startTime} – {r.endTime}</td>
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-300 hidden md:table-cell">{locById.get(r.locationId) ?? "—"}{r.position ? ` · ${r.position}` : ""}</td>
                  <td className="px-4 py-2.5 text-[11px] text-ink-500 dark:text-ink-400 hidden lg:table-cell">
                    from {r.effectiveFrom.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {r.effectiveUntil && <> · until {r.effectiveUntil.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {r.active ? <span className="badge-green">Active</span> : <span className="badge-gray">Paused</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <RecurringShiftEditor
                      mode="edit"
                      members={members.map(m => ({ id: m.id, name: m.user.name, position: m.position }))}
                      locations={locations.map(l => ({ id: l.id, name: l.name }))}
                      existing={{
                        id: r.id, memberId: r.memberId, locationId: r.locationId,
                        dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime,
                        position: r.position, active: r.active,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </div>
  );
}
