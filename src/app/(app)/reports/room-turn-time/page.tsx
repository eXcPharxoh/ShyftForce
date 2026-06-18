import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Bed, Clock, Trophy } from "lucide-react";
import { addDays } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RANGES = { week: 7, month: 30, quarter: 90 };

export default async function RoomTurnTimeReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const rangeKey = (sp.range ?? "week") as keyof typeof RANGES;
  const days = RANGES[rangeKey] ?? 7;
  const since = addDays(new Date(), -days);

  const completed = await prisma.hotelRoomAssignment.findMany({
    where: {
      hotelRoom: { organizationId: u.organizationId },
      completedAt: { not: null, gte: since },
      startedAt:   { not: null },
    },
    include: {
      member: { include: { user: { select: { name: true } } } },
      hotelRoom: { select: { number: true, type: true } },
    },
    orderBy: { completedAt: "desc" },
  });

  // Compute turn-time per housekeeper
  const byHousekeeper = new Map<string, { name: string; rooms: number; totalMin: number; minMin: number; maxMin: number }>();
  for (const a of completed) {
    const mins = (+a.completedAt! - +a.startedAt!) / 60_000;
    if (mins <= 0 || mins > 600) continue; // ignore obvious bad data (>10h)
    const key = a.memberId;
    if (!byHousekeeper.has(key)) byHousekeeper.set(key, { name: a.member.user.name, rooms: 0, totalMin: 0, minMin: Infinity, maxMin: 0 });
    const v = byHousekeeper.get(key)!;
    v.rooms++;
    v.totalMin += mins;
    v.minMin = Math.min(v.minMin, mins);
    v.maxMin = Math.max(v.maxMin, mins);
  }
  const leaderboard = Array.from(byHousekeeper.values())
    .map(v => ({ ...v, avgMin: v.totalMin / v.rooms }))
    .sort((a, b) => a.avgMin - b.avgMin);

  const totalRooms = completed.length;
  const totalMin   = completed.reduce((a, x) => a + Math.max(0, (+x.completedAt! - +x.startedAt!) / 60_000), 0);
  const orgAvgMin  = totalRooms > 0 ? totalMin / totalRooms : 0;

  // Turn-time by room type
  const byType = new Map<string, { rooms: number; totalMin: number }>();
  for (const a of completed) {
    const mins = (+a.completedAt! - +a.startedAt!) / 60_000;
    if (mins <= 0 || mins > 600) continue;
    const t = a.hotelRoom.type;
    if (!byType.has(t)) byType.set(t, { rooms: 0, totalMin: 0 });
    const v = byType.get(t)!;
    v.rooms++; v.totalMin += mins;
  }
  const typeRows = Array.from(byType.entries()).sort((a, b) => b[1].rooms - a[1].rooms);

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        eyebrow="Hospitality · Report"
        icon={Clock}
        title="Room turn time"
        subtitle="Average minutes-per-room by housekeeper. Identify training opportunities + reward your fastest cleaners."
      >
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-xl">
          {Object.keys(RANGES).map(k => (
            <Link key={k} href={`/reports/room-turn-time?range=${k}`} className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${rangeKey === k ? "bg-white dark:bg-ink-900 shadow" : ""}`}>
              {k}
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Rooms turned</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">{totalRooms}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">{(totalRooms / days).toFixed(1)}/day avg</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Org avg turn</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">{orgAvgMin.toFixed(0)}m</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Fastest cleaner</div>
          <div className="text-base font-bold tracking-tight-2 mt-1 truncate">{leaderboard[0]?.name ?? "—"}</div>
          {leaderboard[0] && <div className="text-[11px] text-emerald-600 mt-0.5">{leaderboard[0].avgMin.toFixed(0)}m avg</div>}
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Housekeepers active</div>
          <div className="text-2xl font-bold tracking-tight-2 mt-1">{leaderboard.length}</div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Housekeeper leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-ink-500">No completed room turns in this window.</p>
        ) : (
          <ul className="space-y-1">
            {leaderboard.map((v, i) => {
              const slowestAvg = leaderboard[leaderboard.length - 1].avgMin;
              const widthPct = slowestAvg > 0 ? Math.max(20, (v.avgMin / slowestAvg) * 100) : 0;
              return (
                <li key={v.name} className="card p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                    i === 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" :
                    i < 3   ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" :
                              "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300"
                  }`}>
                    {i === 0 ? <Trophy className="w-4 h-4" /> : `#${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{v.name}</div>
                    <div className="text-[11px] text-ink-700 dark:text-ink-300">
                      <b>{v.avgMin.toFixed(0)}m</b> avg · {v.rooms} room{v.rooms === 1 ? "" : "s"} · range {v.minMin.toFixed(0)}–{v.maxMin.toFixed(0)}m
                    </div>
                    <div className="w-full bg-ink-100 dark:bg-ink-800 rounded-full h-1.5 mt-1">
                      <div className={`h-1.5 rounded-full ${v.avgMin <= orgAvgMin ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* By room type */}
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-3">By room type</h3>
        {typeRows.length === 0 ? (
          <p className="text-sm text-ink-500">No data.</p>
        ) : (
          <table className="t-modern">
            <thead>
              <tr>
                <th>Type</th>
                <th className="text-right">Rooms</th>
                <th className="text-right">Avg turn</th>
              </tr>
            </thead>
            <tbody>
              {typeRows.map(([t, v]) => (
                <tr key={t}>
                  <td className="capitalize text-ink-50">{t}</td>
                  <td className="text-right text-ink-200">{v.rooms}</td>
                  <td className="text-right font-semibold text-ink-50">{(v.totalMin / v.rooms).toFixed(0)}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
