import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addDays, startOfWeek } from "@/lib/utils";
import { checkCompliance } from "@/lib/compliance/engine";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";

// Runs the engine against currently-saved shifts for the org over a date range.
// Query params: from, to, location
export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to   = url.searchParams.get("to");
  const locationId = url.searchParams.get("location");

  const start = from ? new Date(from) : addDays(startOfWeek(new Date()), -7);
  const end   = to   ? new Date(to)   : addDays(startOfWeek(new Date()), 14);

  const where: any = {
    location: { organizationId: u.organizationId },
    startsAt: { gte: start, lt: end },
    memberId: { not: null },
  };
  if (locationId) where.locationId = locationId;

  const [shifts, members, settings] = await Promise.all([
    prisma.shift.findMany({ where, include: { member: { include: { user: true } } } }),
    prisma.member.findMany({ where: { organizationId: u.organizationId }, include: { user: true } }),
    getOrCreateComplianceSettings(u.organizationId),
  ]);

  const violations = checkCompliance({
    shifts: shifts.map(s => ({ id: s.id, memberId: s.memberId, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status, createdAt: s.createdAt })),
    members: members.map(m => ({ id: m.id, name: m.user.name })),
    settings,
  });

  return NextResponse.json({
    range: { from: start.toISOString().slice(0,10), to: end.toISOString().slice(0,10) },
    settings,
    violations,
    summary: {
      total: violations.length,
      errors: violations.filter(v => v.severity === "error").length,
      warnings: violations.filter(v => v.severity === "warning").length,
      affectedMembers: new Set(violations.map(v => v.memberId)).size,
    },
  });
}
