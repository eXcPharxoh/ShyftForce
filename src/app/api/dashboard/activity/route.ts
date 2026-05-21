// Live activity feed for the home dashboard.
// Polled by HomeShell every 15s to surface new clock-ins / claims /
// approvals without a full page reload.
//
// Why polling instead of SSE? Vercel serverless functions have a max
// duration; an always-open SSE stream costs invocations. Polling at
// 15s is cheap, plays nice with caching, and gracefully degrades if
// the user closes the tab.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  // Default: last 24h. Clients pass `since` (ISO timestamp) to get only new entries.
  const since = sinceParam ? new Date(sinceParam) : addDays(new Date(), -1);

  const [logs, offers] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: { member: { organizationId: u.organizationId }, at: { gte: since } },
      orderBy: { at: "desc" }, take: 20,
      include: { member: { include: { user: true, location: true } } },
    }),
    prisma.openShiftOffer.findMany({
      where: { shift: { location: { organizationId: u.organizationId } }, sentAt: { gte: since } },
      orderBy: { sentAt: "desc" }, take: 10,
      include: { member: { include: { user: true } }, shift: true },
    }),
  ]);

  const activity = [
    ...logs.map(l => ({
      id: `log-${l.id}`,
      kind: (l.type === "clock_in" || l.type === "break_end")
        ? "clock_in" as const
        : "clock_out" as const,
      message: `${l.member.user.name} ${
        l.type === "clock_in" ? "clocked in" :
        l.type === "clock_out" ? "clocked out" :
        l.type === "break_start" ? "started break" :
        "back from break"
      }${l.member.location?.name ? ` at ${l.member.location.name}` : ""}`,
      at: l.at.toISOString(),
    })),
    ...offers.map(o => ({
      id: `offer-${o.id}`,
      kind: o.status === "claimed" ? "claim" as const : "copilot" as const,
      message: o.status === "claimed"
        ? `${o.member.user.name} claimed an open shift${o.shift?.position ? ` (${o.shift.position})` : ""}`
        : `Open-shift offer sent to ${o.member.user.name}`,
      at: o.sentAt.toISOString(),
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 20);

  return NextResponse.json({ activity, now: new Date().toISOString() });
}
