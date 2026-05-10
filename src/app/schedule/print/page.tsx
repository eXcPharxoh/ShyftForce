import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, fmtHours, startOfWeek, timeLabel } from "@/lib/utils";
import { PrintButton } from "@/components/schedule/print-button";

export default async function PrintSchedule({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const weekStart = sp.w ? new Date(sp.w) : startOfWeek(new Date());
  weekStart.setHours(0,0,0,0);
  const weekEnd = addDays(weekStart, 7);

  const [shifts, members, org] = await Promise.all([
    prisma.shift.findMany({
      where: {
        location: { organizationId: u.organizationId },
        startsAt: { gte: weekStart, lt: weekEnd },
        memberId: { not: null },
        status: "published",
      },
      include: { member: { include: { user: true } }, location: true },
      orderBy: [{ startsAt: "asc" }],
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: true, location: true },
      orderBy: [{ user: { name: "asc" } }],
    }),
    prisma.organization.findUnique({ where: { id: u.organizationId } }),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byMemberDay = new Map<string, Map<number, typeof shifts>>();
  for (const s of shifts) {
    if (!s.memberId) continue;
    const dayIdx = Math.floor((+s.startsAt - +weekStart) / 86400000);
    if (!byMemberDay.has(s.memberId)) byMemberDay.set(s.memberId, new Map());
    const m = byMemberDay.get(s.memberId)!;
    if (!m.has(dayIdx)) m.set(dayIdx, [] as any);
    (m.get(dayIdx) as any).push(s);
  }

  return (
    <html lang="en">
      <head>
        <title>{`Schedule — ${dateLabel(weekStart)} → ${dateLabel(addDays(weekEnd, -1))}`}</title>
        <style>{`
          * { box-sizing: border-box; }
          body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          h1 { font-size: 22px; margin: 0; letter-spacing: -0.018em; }
          .meta { font-size: 11px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
          thead th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-size: 9px; color: #475569; }
          .name { white-space: nowrap; min-width: 120px; }
          .name .pos { font-weight: 400; color: #64748b; font-size: 10px; }
          .shift { background: #fff7ed; border-radius: 4px; padding: 4px 6px; margin-bottom: 3px; }
          .shift .time { font-weight: 700; }
          .shift .where { color: #475569; font-size: 10px; }
          .total { text-align: right; font-weight: 700; }
          .footer { margin-top: 16px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
          .actions { margin-bottom: 12px; }
          .btn { display: inline-block; padding: 6px 12px; background: #f97316; color: #fff; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; cursor: pointer; border: 0; }
          @media print {
            .actions { display: none; }
            body { padding: 12px; }
          }
        `}</style>
      </head>
      <body>
        <div className="actions">
          <PrintButton />
        </div>
        <div className="header">
          <div>
            <h1>{org?.name ?? "Schedule"}</h1>
            <div className="meta">Week of {dateLabel(weekStart)} → {dateLabel(addDays(weekEnd, -1))}</div>
          </div>
          <div className="meta">Generated {new Date().toLocaleString()}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Employee</th>
              {days.map(d => (
                <th key={+d}>
                  {d.toLocaleDateString("en-US", { weekday: "short" })}<br/>
                  {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </th>
              ))}
              <th className="total">Hrs</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const memberShifts = byMemberDay.get(m.id);
              const totalHrs = shifts.filter(s => s.memberId === m.id).reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600000, 0);
              return (
                <tr key={m.id}>
                  <td className="name">
                    <div>{m.user.name}</div>
                    <div className="pos">{m.position ?? "—"}{m.location ? ` · ${m.location.name}` : ""}</div>
                  </td>
                  {days.map((_, i) => {
                    const items = memberShifts?.get(i) ?? [];
                    return (
                      <td key={i}>
                        {items.map((s: any) => (
                          <div className="shift" key={s.id}>
                            <div className="time">{timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}</div>
                            <div className="where">{s.position ?? s.location.name}</div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                  <td className="total">{fmtHours(totalHrs)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="footer">
          <div>{shifts.length} shifts · {members.length} employees · {fmtHours(shifts.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600000, 0))} total</div>
          <div>shyftforce</div>
        </div>
      </body>
    </html>
  );
}
