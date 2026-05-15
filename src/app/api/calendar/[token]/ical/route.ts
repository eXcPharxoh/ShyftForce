// Public iCal feed for a single member, keyed by their unguessable
// calendarToken. Returns text/calendar so Apple Calendar / Google Calendar /
// Outlook can subscribe via "Subscribe to URL".
//
// The token does NOT carry session cookies — it's a bearer secret in the URL
// path itself. Anyone with the URL can read the member's shifts (read-only).
// Members can rotate via POST /api/me/calendar/rotate-token.

import { prisma } from "@/lib/prisma";
import { buildIcs, type IcsEvent } from "@/lib/calendar/ics";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return new Response("Invalid token", { status: 404 });
  }

  const member = await prisma.member.findFirst({
    where: { calendarToken: token },
    include: { user: { select: { name: true } }, organization: { select: { name: true } } },
  });
  if (!member) return new Response("Calendar not found or token revoked", { status: 404 });

  const now = new Date();
  const horizonStart = new Date(now.getTime() - 30 * 86400 * 1000);  // 30 days back
  const horizonEnd   = new Date(now.getTime() + 90 * 86400 * 1000);  // 90 days forward

  const shifts = await prisma.shift.findMany({
    where: {
      memberId: member.id,
      startsAt: { gte: horizonStart, lt: horizonEnd },
      // Hide drafts — only published shifts should show in personal calendars
      status: "published",
    },
    include: { location: true },
    orderBy: { startsAt: "asc" },
  });

  const events: IcsEvent[] = shifts.map(s => ({
    uid:         `shift-${s.id}@shyftforce.com`,
    summary:     `${s.position ?? "Shift"} · ${s.location.name}`,
    description: s.notes ?? `Your scheduled shift at ${s.location.name}.`,
    location:    s.location.name,
    startsAt:    s.startsAt,
    endsAt:      s.endsAt,
    status:      "CONFIRMED",
    url:         "https://app.shyftforce.com/schedule",
  }));

  const body = buildIcs({
    calendarName: `${member.user.name} · ${member.organization.name}`,
    description:  `ShyftForce schedule for ${member.user.name}`,
    refreshIntervalMinutes: 60,
    events,
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":  "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="schedule.ics"`,
      // Calendar clients aggressively cache — keep it short so updates appear soon
      "Cache-Control": "private, max-age=300, must-revalidate",
    },
  });
}
