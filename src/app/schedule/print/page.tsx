import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, fmtHours, fmtMoney, startOfWeek, timeLabel } from "@/lib/utils";
import { holidaysForJurisdiction } from "@/lib/compliance/holidays";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";
import { PrintButton } from "@/components/schedule/print-button";

/**
 * Print / Save-as-PDF schedule page.
 *
 * URL params:
 *   ?w=YYYY-MM-DD          — week start date (defaults to current week)
 *   ?view=position|employee — grouping (defaults to position — design canonical)
 *   ?size=letter|a4        — page size (defaults to letter)
 *
 * Use the browser's "Save as PDF" from the print dialog to produce a PDF.
 * (Avoids shipping Puppeteer/Chromium binaries; the print stylesheet is
 * tuned so the output is publish-quality.)
 */

export const dynamic = "force-dynamic";

export default async function PrintSchedule({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; view?: "position" | "employee"; size?: "letter" | "a4" }>;
}) {
  const u = await requireUser();
  const sp = await searchParams;
  const weekStart = sp.w ? new Date(sp.w) : startOfWeek(new Date());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = addDays(weekStart, 7);
  const view = sp.view ?? "position";
  const pageSize = sp.size ?? "letter";

  const [shifts, members, org, settings] = await Promise.all([
    prisma.shift.findMany({
      where: {
        location: { organizationId: u.organizationId },
        startsAt: { gte: weekStart, lt: weekEnd },
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
    getOrCreateComplianceSettings(u.organizationId),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const memberById = new Map(members.map((m) => [m.id, m]));

  // Stat holiday lookup
  const yearHolidays = holidaysForJurisdiction(settings.jurisdiction ?? "default", weekStart.getUTCFullYear());
  function holidayOn(d: Date) {
    const iso = d.toISOString().slice(0, 10);
    return yearHolidays.find((h) => h.date === iso);
  }

  // Per-day totals
  const dayTotals = days.map((_, di) => {
    const dayShifts = shifts.filter((s) => {
      const idx = Math.floor((+s.startsAt - +weekStart) / 86400000);
      return idx === di && s.memberId;
    });
    const hours = dayShifts.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600_000, 0);
    const cost = dayShifts.reduce(
      (a, s) => a + ((+s.endsAt - +s.startsAt) / 3600_000) * (memberById.get(s.memberId!)?.hourlyRate ?? 0),
      0
    );
    return { hours, cost };
  });

  const totalHours = dayTotals.reduce((a, t) => a + t.hours, 0);
  const totalCost = dayTotals.reduce((a, t) => a + t.cost, 0);

  // Group rows
  const rows: { key: string; label: string; sub: string; shifts: typeof shifts; total: number }[] = [];
  if (view === "position") {
    const byPos = new Map<string, typeof shifts>();
    for (const s of shifts) {
      if (!s.memberId) continue;
      const k = s.position ?? "(no position)";
      if (!byPos.has(k)) byPos.set(k, [] as any);
      (byPos.get(k) as any).push(s);
    }
    for (const [k, ss] of [...byPos.entries()].sort()) {
      const total = ss.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600_000, 0);
      rows.push({ key: k, label: k, sub: `${ss.length} shift${ss.length === 1 ? "" : "s"}`, shifts: ss, total });
    }
  } else {
    for (const m of members) {
      const ss = shifts.filter((s) => s.memberId === m.id);
      if (ss.length === 0) continue;
      const total = ss.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600_000, 0);
      rows.push({
        key: m.id,
        label: m.user.name,
        sub: `${m.position ?? ""}${m.location ? ` · ${m.location.name}` : ""}`,
        shifts: ss,
        total,
      });
    }
  }

  // Open shifts as a separate row
  const openShifts = shifts.filter((s) => s.isOpen);

  const pageWidth = pageSize === "a4" ? "210mm" : "8.5in";
  const pageHeight = pageSize === "a4" ? "297mm" : "11in";

  return (
    <html lang="en">
      <head>
        <title>{`Schedule — ${dateLabel(weekStart)} → ${dateLabel(addDays(weekEnd, -1))}`}</title>
        <style>{`
          @page { size: ${pageSize === "a4" ? "A4 landscape" : "Letter landscape"}; margin: 0.4in; }
          * { box-sizing: border-box; }
          body {
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            margin: 0; padding: 0;
            color: #0f172a; background: #fff;
            font-size: 11px; line-height: 1.4;
          }
          .page {
            padding: 18px 24px;
            min-height: 100vh;
          }
          .actions {
            display: flex; gap: 8px; padding: 12px 24px; background: #f1f5f9;
            border-bottom: 1px solid #cbd5e1;
            align-items: center;
          }
          .actions .links { margin-left: auto; display: flex; gap: 6px; }
          .actions .link {
            font-size: 11px; color: #475569; padding: 4px 8px; border-radius: 4px;
            background: #fff; border: 1px solid #cbd5e1; text-decoration: none;
          }
          .actions .link.active { background: #0f172a; color: #fff; border-color: #0f172a; }

          .header {
            display: flex; justify-content: space-between; align-items: flex-end;
            border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px;
          }
          .brand { display: flex; align-items: center; gap: 8px; }
          .brand .bolt {
            width: 22px; height: 22px;
            background: linear-gradient(135deg, #9bc1ff, #3a6fd8);
            -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M13 2L4 14H11L9 22L20 9H13Z'/></svg>") center/contain no-repeat;
                    mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M13 2L4 14H11L9 22L20 9H13Z'/></svg>") center/contain no-repeat;
          }
          .brand .name { font-weight: 600; letter-spacing: -0.02em; color: #0f172a; font-size: 13px; }
          h1 { font-size: 18px; margin: 4px 0 0; letter-spacing: -0.02em; }
          .meta { font-size: 10px; color: #64748b; }
          .meta-strong { color: #0f172a; font-weight: 600; }

          table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: top; }
          thead th {
            background: #f8fafc; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.06em; font-size: 9px; color: #475569;
            padding: 6px 6px;
          }
          th.day, td.day { width: 11.5%; }
          th.row-head, td.row-head { width: 14%; }
          th.total, td.total { width: 6%; text-align: right; }
          .row-head .label { font-weight: 700; font-size: 11.5px; color: #0f172a; }
          .row-head .sub { font-weight: 400; color: #64748b; font-size: 9.5px; margin-top: 1px; }
          .today { background: #fffbeb !important; border-left: 2px solid #f59e0b !important; }
          .holiday-mark {
            display: inline-block; background: #fef3c7; color: #92400e;
            font-size: 8px; padding: 1px 4px; border-radius: 3px; margin-left: 4px;
            font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
          }

          .shift {
            background: linear-gradient(180deg, #dbeafe, #eff6ff);
            border-left: 2px solid #3b82f6;
            border-radius: 3px;
            padding: 3px 5px;
            margin-bottom: 3px;
          }
          .shift.hot {
            background: linear-gradient(180deg, #fee2e2, #fef2f2);
            border-left-color: #ef4444;
          }
          .shift.open {
            background: linear-gradient(180deg, #fef3c7, #fffbeb);
            border-left-color: #f59e0b;
          }
          .shift .time { font-weight: 700; font-size: 10.5px; color: #0f172a; }
          .shift .who { font-size: 9.5px; color: #475569; margin-top: 1px; line-height: 1.2; }
          .shift .pos { font-size: 9px; color: #64748b; font-style: italic; }

          .totals-row { background: #f1f5f9 !important; font-weight: 600; }
          .totals-row td { padding: 8px 6px; }
          .totals-row .day-total { color: #0f172a; font-size: 11px; }
          .totals-row .day-total .cost { color: #64748b; font-weight: 400; font-size: 9.5px; display: block; margin-top: 1px; }

          .open-shifts-row { background: #fffbeb; }
          .open-shifts-row .label { color: #b45309; font-weight: 700; }

          .footer {
            margin-top: 16px; padding-top: 8px; border-top: 1px solid #cbd5e1;
            display: flex; justify-content: space-between; align-items: center;
            font-size: 9.5px; color: #64748b;
          }
          .legend { display: flex; gap: 12px; font-size: 9px; }
          .legend-item { display: flex; align-items: center; gap: 4px; }
          .legend-dot { width: 10px; height: 10px; border-radius: 2px; }

          @media print {
            .actions { display: none !important; }
            .page { padding: 0; }
            body { background: #fff; }
          }
        `}</style>
      </head>
      <body>
        <div className="actions">
          <PrintButton />
          <div className="links">
            <a className={`link ${view === "position" ? "active" : ""}`} href={`/schedule/print?w=${weekStart.toISOString().slice(0,10)}&view=position&size=${pageSize}`}>By position</a>
            <a className={`link ${view === "employee" ? "active" : ""}`} href={`/schedule/print?w=${weekStart.toISOString().slice(0,10)}&view=employee&size=${pageSize}`}>By employee</a>
            <a className={`link ${pageSize === "letter" ? "active" : ""}`} href={`/schedule/print?w=${weekStart.toISOString().slice(0,10)}&view=${view}&size=letter`}>Letter</a>
            <a className={`link ${pageSize === "a4" ? "active" : ""}`} href={`/schedule/print?w=${weekStart.toISOString().slice(0,10)}&view=${view}&size=a4`}>A4</a>
          </div>
        </div>

        <div className="page">
          <div className="header">
            <div>
              <div className="brand">
                <span className="bolt" />
                <span className="name">{org?.name ?? "Schedule"}</span>
              </div>
              <h1>Week of {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h1>
              <div className="meta">
                {dateLabel(weekStart)} → {dateLabel(addDays(weekEnd, -1))}
                {" · "}<span className="meta-strong">{shifts.length}</span> shifts
                {" · "}<span className="meta-strong">{fmtHours(totalHours)}</span> scheduled
                {" · "}<span className="meta-strong">{fmtMoney(totalCost)}</span> labor cost
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="meta">Generated {new Date().toLocaleString()}</div>
              <div className="meta">Grouped by {view}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th className="row-head">{view === "position" ? "Position" : "Employee"}</th>
                {days.map((d) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  const h = holidayOn(d);
                  return (
                    <th key={+d} className={`day ${isToday ? "today" : ""}`}>
                      {d.toLocaleDateString("en-US", { weekday: "short" })}{" "}
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {h && <span className="holiday-mark" title={h.name}>HOL</span>}
                    </th>
                  );
                })}
                <th className="total">Hrs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="row-head">
                    <div className="label">{r.label}</div>
                    {r.sub && <div className="sub">{r.sub}</div>}
                  </td>
                  {days.map((_, di) => {
                    const items = r.shifts.filter((s) => Math.floor((+s.startsAt - +weekStart) / 86400000) === di);
                    const isToday = days[di].toDateString() === new Date().toDateString();
                    return (
                      <td key={di} className={`day ${isToday ? "today" : ""}`}>
                        {items.map((s) => (
                          <div className="shift" key={s.id}>
                            <div className="time">{timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}</div>
                            {view === "position" && s.member && (
                              <div className="who">{s.member.user.name}</div>
                            )}
                            {view === "employee" && s.position && (
                              <div className="pos">{s.position}</div>
                            )}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                  <td className="total">{fmtHours(r.total)}</td>
                </tr>
              ))}

              {/* Open shifts as a flagged row */}
              {openShifts.length > 0 && (
                <tr className="open-shifts-row">
                  <td className="row-head">
                    <div className="label">Open shifts</div>
                    <div className="sub">{openShifts.length} unfilled</div>
                  </td>
                  {days.map((_, di) => {
                    const items = openShifts.filter((s) => Math.floor((+s.startsAt - +weekStart) / 86400000) === di);
                    return (
                      <td key={di} className="day">
                        {items.map((s) => (
                          <div className="shift open" key={s.id}>
                            <div className="time">{timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}</div>
                            <div className="who">OPEN · {s.position ?? "Shift"}</div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                  <td className="total">—</td>
                </tr>
              )}

              {/* Totals row */}
              <tr className="totals-row">
                <td className="row-head">
                  <div className="label">Day totals</div>
                </td>
                {dayTotals.map((t, di) => (
                  <td key={di} className="day day-total" style={{ textAlign: "center" }}>
                    {fmtHours(t.hours)}
                    <span className="cost">{fmtMoney(t.cost)}</span>
                  </td>
                ))}
                <td className="total day-total">
                  {fmtHours(totalHours)}
                  <span className="cost">{fmtMoney(totalCost)}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="footer">
            <div className="legend">
              <span className="legend-item"><span className="legend-dot" style={{ background: "#3b82f6" }} /> Scheduled</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: "#ef4444" }} /> Hot shift</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: "#f59e0b" }} /> Open</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: "#fef3c7", border: "1px solid #f59e0b" }} /> Holiday</span>
            </div>
            <div>shyftforce · printed {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
