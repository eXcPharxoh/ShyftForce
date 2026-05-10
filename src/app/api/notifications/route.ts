import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type NotificationType =
  | "time_off_pending" | "expense_pending" | "timesheet_flagged"
  | "shift_offer" | "kudos_received" | "message_unread"
  | "billboard_new" | "compliance_warning";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  href: string;
  createdAt: string;          // ISO
  emoji: string;
  severity: "info" | "warning" | "success";
};

export async function GET() {
  const u = await requireUser();
  const orgId = u.organizationId;
  const me = u.memberId;
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const since = new Date(Date.now() - 30 * 86400 * 1000);  // last 30 days

  const [
    timeOffPending, expensePending, timesheetFlagged,
    myOffers, myKudos, myUnreadMessages, recentBillboard,
  ] = await Promise.all([
    isManager ? prisma.timeOffRequest.findMany({
      where: { member: { organizationId: orgId }, status: "pending" },
      include: { member: { include: { user: true } } },
      orderBy: { createdAt: "desc" }, take: 10,
    }) : Promise.resolve([]),
    isManager ? prisma.expenseRequest.findMany({
      where: { member: { organizationId: orgId }, status: "pending" },
      include: { member: { include: { user: true } } },
      orderBy: { createdAt: "desc" }, take: 10,
    }) : Promise.resolve([]),
    isManager ? prisma.timesheetEntry.count({
      where: { flagged: true, member: { organizationId: orgId } },
    }) : Promise.resolve(0),
    prisma.openShiftOffer.findMany({
      where: { memberId: me, status: "pending", expiresAt: { gt: new Date() } },
      include: { shift: { include: { location: true } } },
      orderBy: { expiresAt: "asc" }, take: 5,
    }),
    prisma.kudos.findMany({
      where: { toId: me, createdAt: { gte: since } },
      include: { from: { include: { user: true } } },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
    prisma.message.findMany({
      where: { toId: me, readAt: null },
      include: { from: { include: { user: true } } },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
    prisma.billboardPost.findMany({
      where: { organizationId: orgId, publishedAt: { gte: since } },
      orderBy: { publishedAt: "desc" }, take: 3,
    }),
  ]);

  const out: Notification[] = [];

  for (const r of timeOffPending) {
    out.push({
      id: `to_${r.id}`, type: "time_off_pending",
      title: `Time off request · ${r.member.user.name}`,
      body: `${fmtDate(r.startsOn)} → ${fmtDate(r.endsOn)} · ${r.category}`,
      href: "/time-off", emoji: "🌙", severity: "warning",
      createdAt: r.createdAt.toISOString(),
    });
  }
  for (const r of expensePending) {
    out.push({
      id: `ex_${r.id}`, type: "expense_pending",
      title: `Expense · ${r.member.user.name}`,
      body: `$${r.amount.toFixed(2)} · ${r.category ?? "general"}`,
      href: "/expenses", emoji: "💳", severity: "warning",
      createdAt: r.createdAt.toISOString(),
    });
  }
  if (timesheetFlagged > 0) {
    out.push({
      id: "ts_flagged", type: "timesheet_flagged",
      title: `${timesheetFlagged} flagged timesheet${timesheetFlagged === 1 ? "" : "s"}`,
      body: "Review and approve, or follow up with the employee.",
      href: "/attendance", emoji: "⏱️", severity: "warning",
      createdAt: new Date().toISOString(),
    });
  }
  for (const o of myOffers) {
    out.push({
      id: `os_${o.id}`, type: "shift_offer",
      title: `Open shift offered to you`,
      body: `${o.shift.position ?? "Shift"} at ${o.shift.location.name} · ${fmtDate(o.shift.startsAt)}`,
      href: "/open-shifts", emoji: "📅", severity: "info",
      createdAt: o.sentAt.toISOString(),
    });
  }
  for (const k of myKudos) {
    out.push({
      id: `k_${k.id}`, type: "kudos_received",
      title: `${k.from.user.name} sent you a high five`,
      body: `"${k.message}"`,
      href: "/hr/kudos", emoji: k.emoji ?? "🙌", severity: "success",
      createdAt: k.createdAt.toISOString(),
    });
  }
  for (const m of myUnreadMessages) {
    out.push({
      id: `m_${m.id}`, type: "message_unread",
      title: `New message from ${m.from.user.name}`,
      body: m.body.slice(0, 80),
      href: "/messenger", emoji: "💬", severity: "info",
      createdAt: m.createdAt.toISOString(),
    });
  }
  for (const p of recentBillboard) {
    out.push({
      id: `b_${p.id}`, type: "billboard_new",
      title: `Announcement: ${p.title}`,
      body: p.body.slice(0, 80),
      href: "/billboard", emoji: "📢", severity: "info",
      createdAt: p.publishedAt.toISOString(),
    });
  }

  // Sort newest first
  out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return NextResponse.json({
    notifications: out,
    unreadCount: out.length,
    hasUnread: out.length > 0,
  });
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
