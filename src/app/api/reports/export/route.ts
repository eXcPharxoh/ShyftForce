import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { csvResponse, toCsv } from "@/lib/csv";

// GET /api/reports/export?type=timesheets|members|shifts
export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "timesheets";

  if (type === "members") {
    const members = await prisma.member.findMany({
      where: { organizationId: u.organizationId },
      include: { user: true, location: true },
      orderBy: { user: { name: "asc" } },
    });
    const rows = members.map(m => ({
      name: m.user.name, email: m.user.email,
      role: m.role, position: m.position ?? "",
      location: m.location?.name ?? "",
      hireDate: m.hireDate.toISOString().slice(0,10),
      hourlyRate: m.hourlyRate ?? "",
      phone: m.phone ?? "",
      status: m.status,
    }));
    return csvResponse(`members-${new Date().toISOString().slice(0,10)}.csv`, toCsv(rows));
  }

  if (type === "shifts") {
    const shifts = await prisma.shift.findMany({
      where: { location: { organizationId: u.organizationId } },
      include: { member: { include: { user: true } }, location: true },
      orderBy: { startsAt: "asc" },
    });
    const rows = shifts.map(s => ({
      member:    s.member?.user.name ?? "(open shift)",
      location:  s.location.name,
      startsAt:  s.startsAt.toISOString(),
      endsAt:    s.endsAt.toISOString(),
      hours:     ((+s.endsAt - +s.startsAt) / 3600000).toFixed(2),
      position:  s.position ?? "",
      status:    s.status,
      isOpen:    s.isOpen,
    }));
    return csvResponse(`shifts-${new Date().toISOString().slice(0,10)}.csv`, toCsv(rows));
  }

  // Default: timesheets for the open period
  const period = await prisma.payPeriod.findFirst({
    where: { organizationId: u.organizationId, status: "open" },
    include: { entries: { include: { member: { include: { user: true, location: true } } } } },
  });
  const rows = (period?.entries ?? []).map(e => ({
    member:   e.member.user.name,
    email:    e.member.user.email,
    location: e.member.location?.name ?? "",
    date:     e.date.toISOString().slice(0,10),
    hours:    e.hours.toFixed(2),
    rate:     e.member.hourlyRate ?? "",
    cost:     ((e.member.hourlyRate ?? 0) * e.hours).toFixed(2),
    approved: e.approved,
    flagged:  e.flagged,
    notes:    e.notes ?? "",
  }));
  const fname = `timesheets-${period ? period.startsOn.toISOString().slice(0,10) + "-to-" + period.endsOn.toISOString().slice(0,10) : "current"}.csv`;
  return csvResponse(fname, toCsv(rows));
}
