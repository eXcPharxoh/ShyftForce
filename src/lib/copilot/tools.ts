import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { addDays, dateLabel, fmtMoney, startOfWeek, timeLabel } from "@/lib/utils";
import { checkCompliance } from "@/lib/compliance/engine";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";
import { rankForShift, sendOffers } from "@/lib/marketplace/service";
import { WAVES } from "@/lib/marketplace/ranker";

// ---------- Schemas surfaced to Claude ----------
export const TOOLS: Tool[] = [
  {
    name: "search_members",
    description: "Find team members by name, email, role, location, or position. Returns minimal info (id, name, role, location, position, email).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Substring match against name or email" },
        role: { type: "string", enum: ["ADMIN", "MANAGER", "EMPLOYEE"] },
        location: { type: "string", description: "Match against location name (substring)" },
        position: { type: "string", description: "Match against position (substring)" },
      },
    },
  },
  {
    name: "search_shifts",
    description: "Find shifts within a date range, optionally filtered by location, member, or status (draft|published|open).",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "ISO date (YYYY-MM-DD). Defaults to start of this week." },
        to:   { type: "string", description: "ISO date (YYYY-MM-DD). Defaults to end of this week." },
        location: { type: "string" },
        memberName: { type: "string" },
        status: { type: "string", enum: ["draft", "published", "open"] },
      },
    },
  },
  {
    name: "create_shifts",
    description: "Create one or more shifts. Manager/Admin only. By default shifts are saved as drafts; pass publish=true to publish immediately.",
    input_schema: {
      type: "object",
      properties: {
        shifts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              memberName: { type: "string", description: "Employee name (or omit + isOpen=true for open shift)" },
              location:   { type: "string", description: "Location name" },
              date:       { type: "string", description: "ISO date YYYY-MM-DD" },
              startTime:  { type: "string", description: "HH:MM 24-hour" },
              endTime:    { type: "string", description: "HH:MM 24-hour" },
              position:   { type: "string" },
              isOpen:     { type: "boolean" },
              notes:      { type: "string" },
            },
            required: ["location", "date", "startTime", "endTime"],
          },
        },
        publish: { type: "boolean", description: "Publish immediately (default false → draft)" },
      },
      required: ["shifts"],
    },
  },
  {
    name: "publish_shifts",
    description: "Publish all draft shifts in a date range so employees can see them. Manager/Admin only.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to:   { type: "string" },
        location: { type: "string" },
      },
    },
  },
  {
    name: "find_shift_replacement",
    description: "Given an existing shift, return ranked candidates who could cover it, scored by availability, current weekly hours, position match, and same-location preference.",
    input_schema: {
      type: "object",
      properties: { shiftId: { type: "string" } },
      required: ["shiftId"],
    },
  },
  {
    name: "get_metrics",
    description: "Get workforce metrics: total hours, payroll cost, OT hours, attendance, kudos count, time-off pending, expense total. Optionally filter by date range.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to:   { type: "string" },
        location: { type: "string" },
      },
    },
  },
  {
    name: "list_pending_approvals",
    description: "Return everything currently waiting on a manager: time-off requests, expense requests, unapproved/flagged timesheets, unpublished schedules.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "send_message",
    description: "Send a direct message to a teammate by name.",
    input_schema: {
      type: "object",
      properties: {
        toMemberName: { type: "string" },
        body:         { type: "string" },
      },
      required: ["toMemberName", "body"],
    },
  },
  {
    name: "send_kudos",
    description: "Post a public high-five recognizing a teammate.",
    input_schema: {
      type: "object",
      properties: {
        toMemberName: { type: "string" },
        message:      { type: "string" },
        emoji:        { type: "string" },
      },
      required: ["toMemberName", "message"],
    },
  },
  {
    name: "check_compliance",
    description: "Run the labor compliance engine over a date range and return all violations (overtime, rest gaps, consecutive days, meal breaks, predictive scheduling). Use when the user asks 'are we in compliance', 'any OT issues', 'who's overworked', etc.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "ISO YYYY-MM-DD. Defaults to last week." },
        to:   { type: "string", description: "ISO YYYY-MM-DD. Defaults to two weeks out." },
      },
    },
  },
  {
    name: "auto_offer_shift",
    description: "Auto-offer an open shift to ranked candidates. Manager+ only. Sends DM offers and creates OpenShiftOffer records. Use when the user says 'find someone for the open Saturday shift' or 'offer this shift to people'. Defaults to wave 1 (top 3) if not specified.",
    input_schema: {
      type: "object",
      properties: {
        shiftId: { type: "string" },
        wave:    { type: "number", description: "1 (top 3, 1h expiry), 2 (next 5, 2h), or 3 (all eligible, 24h). Defaults to 1." },
      },
      required: ["shiftId"],
    },
  },
];

// ---------- Helpers ----------
async function findMemberByName(orgId: string, name: string) {
  const m = await prisma.member.findFirst({
    where: { organizationId: orgId, user: { name: { contains: name } } },
    include: { user: true, location: true },
  });
  return m;
}

async function findLocationByName(orgId: string, name: string) {
  return prisma.location.findFirst({ where: { organizationId: orgId, name: { contains: name } } });
}

function combineDateTime(date: string, time: string): Date {
  // date YYYY-MM-DD, time HH:MM
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi]    = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

function isManager(u: SessionUser) { return u.role === "ADMIN" || u.role === "MANAGER"; }
function forbid(reason = "Manager or Admin role required.") { return { error: reason }; }

// ---------- Dispatcher ----------
export async function runTool(name: string, input: any, user: SessionUser) {
  const orgId = user.organizationId;

  switch (name) {
    case "search_members": {
      const where: any = { organizationId: orgId };
      if (input.role) where.role = input.role;
      if (input.position) where.position = { contains: input.position };
      if (input.location) where.location = { name: { contains: input.location } };
      if (input.query) where.user = { OR: [{ name: { contains: input.query } }, { email: { contains: input.query } }] };
      const members = await prisma.member.findMany({
        where, include: { user: true, location: true }, take: 25, orderBy: { user: { name: "asc" } },
      });
      return {
        members: members.map(m => ({
          id: m.id, name: m.user.name, email: m.user.email,
          role: m.role, position: m.position,
          location: m.location?.name ?? null, hourlyRate: m.hourlyRate,
        })),
      };
    }

    case "search_shifts": {
      const from = input.from ? new Date(input.from) : startOfWeek(new Date());
      const to   = input.to   ? new Date(input.to)   : addDays(startOfWeek(new Date()), 7);
      const where: any = { location: { organizationId: orgId }, startsAt: { gte: from, lt: to } };
      if (input.location) where.location = { ...where.location, name: { contains: input.location } };
      if (input.memberName) where.member = { user: { name: { contains: input.memberName } } };
      if (input.status === "open") where.isOpen = true;
      else if (input.status) where.status = input.status;
      const shifts = await prisma.shift.findMany({
        where, take: 50, orderBy: { startsAt: "asc" },
        include: { member: { include: { user: true } }, location: true },
      });
      return {
        shifts: shifts.map(s => ({
          id: s.id,
          member: s.member?.user.name ?? "(open shift)",
          location: s.location.name,
          date: dateLabel(s.startsAt),
          time: `${timeLabel(s.startsAt)}–${timeLabel(s.endsAt)}`,
          hours: ((+s.endsAt - +s.startsAt) / 3600000).toFixed(1),
          position: s.position,
          status: s.isOpen ? "open" : s.status,
        })),
      };
    }

    case "create_shifts": {
      if (!isManager(user)) return forbid();
      const created: any[] = [];
      for (const spec of input.shifts ?? []) {
        const loc = await findLocationByName(orgId, spec.location);
        if (!loc) { created.push({ error: `Location not found: ${spec.location}` }); continue; }
        let memberId: string | null = null;
        if (spec.memberName && !spec.isOpen) {
          const m = await findMemberByName(orgId, spec.memberName);
          if (!m) { created.push({ error: `Member not found: ${spec.memberName}` }); continue; }
          memberId = m.id;
        }
        const startsAt = combineDateTime(spec.date, spec.startTime);
        const endsAt   = combineDateTime(spec.date, spec.endTime);
        const s = await prisma.shift.create({
          data: {
            locationId: loc.id, memberId,
            startsAt, endsAt,
            position: spec.position ?? null,
            notes: spec.notes ?? null,
            isOpen: !!spec.isOpen || !memberId,
            status: input.publish ? "published" : "draft",
          },
          include: { member: { include: { user: true } }, location: true },
        });
        created.push({
          id: s.id,
          member: s.member?.user.name ?? "(open)",
          location: s.location.name,
          date: dateLabel(s.startsAt),
          time: `${timeLabel(s.startsAt)}–${timeLabel(s.endsAt)}`,
          status: s.status,
        });
      }
      return { created, count: created.filter(c => !c.error).length };
    }

    case "publish_shifts": {
      if (!isManager(user)) return forbid();
      const where: any = { status: "draft", location: { organizationId: orgId } };
      if (input.from) where.startsAt = { gte: new Date(input.from) };
      if (input.to)   where.endsAt   = { lte: new Date(input.to) };
      if (input.location) where.location = { ...where.location, name: { contains: input.location } };
      const r = await prisma.shift.updateMany({ where, data: { status: "published" } });
      return { published: r.count };
    }

    case "find_shift_replacement": {
      if (!isManager(user)) return forbid();
      const shift = await prisma.shift.findUnique({
        where: { id: input.shiftId },
        include: { location: true, member: true },
      });
      if (!shift) return { error: "Shift not found" };
      if (shift.location.organizationId !== orgId) return { error: "Shift not in your org" };

      const candidates = await prisma.member.findMany({
        where: { organizationId: orgId, status: "active", id: { not: shift.memberId ?? undefined } },
        include: { user: true, location: true, shifts: { where: { startsAt: { gte: addDays(shift.startsAt, -7), lt: addDays(shift.startsAt, 7) } } } },
      });
      const ranked = candidates.map(c => {
        let score = 50;
        // same location preference
        if (c.locationId === shift.locationId) score += 25;
        // position match
        if (c.position && shift.position && c.position === shift.position) score += 15;
        // workload — penalty for >40h this week already
        const totalH = c.shifts.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 3600000, 0);
        score -= Math.min(30, Math.max(0, (totalH - 30) * 1.5));
        // conflict — overlapping shift = disqualify
        const conflict = c.shifts.some(s => s.startsAt < shift.endsAt && s.endsAt > shift.startsAt);
        if (conflict) score = -1;
        return { id: c.id, name: c.user.name, position: c.position, location: c.location?.name, weeklyHours: totalH.toFixed(1), score, conflict };
      }).filter(c => c.score >= 0).sort((a, b) => b.score - a.score).slice(0, 5);

      return {
        shift: {
          location: shift.location.name,
          date: dateLabel(shift.startsAt),
          time: `${timeLabel(shift.startsAt)}–${timeLabel(shift.endsAt)}`,
          position: shift.position,
        },
        candidates: ranked,
      };
    }

    case "get_metrics": {
      const period = await prisma.payPeriod.findFirst({
        where: { organizationId: orgId, status: "open" },
        include: { entries: { include: { member: { include: { location: true } } } } },
      });
      const entries = period?.entries ?? [];
      const filt = input.location
        ? entries.filter(e => e.member.location?.name?.toLowerCase().includes(input.location.toLowerCase()))
        : entries;

      const totalHours = filt.reduce((a, e) => a + e.hours, 0);
      const otHours    = filt.filter(e => e.hours > 8).reduce((a, e) => a + (e.hours - 8), 0);
      const cost       = filt.reduce((a, e) => a + e.hours * (e.member.hourlyRate ?? 0), 0);
      const flagged    = filt.filter(e => e.flagged).length;

      const [pendingTimeOff, pendingExpenses, kudosCount, openShifts] = await Promise.all([
        prisma.timeOffRequest.count({ where: { member: { organizationId: orgId }, status: "pending" } }),
        prisma.expenseRequest.count({ where: { member: { organizationId: orgId }, status: "pending" } }),
        prisma.kudos.count({ where: { from: { organizationId: orgId } } }),
        prisma.shift.count({ where: { isOpen: true, location: { organizationId: orgId } } }),
      ]);

      // Top 5 by hours
      const byMember = new Map<string, { name: string; hours: number; cost: number }>();
      for (const e of filt) {
        const cur = byMember.get(e.memberId) ?? { name: (await prisma.user.findFirst({ where: { member: { id: e.memberId } } }))!.name, hours: 0, cost: 0 };
        cur.hours += e.hours; cur.cost += e.hours * (e.member.hourlyRate ?? 0);
        byMember.set(e.memberId, cur);
      }
      const top = [...byMember.values()].sort((a, b) => b.hours - a.hours).slice(0, 5)
        .map(t => ({ name: t.name, hours: t.hours.toFixed(1), cost: fmtMoney(t.cost) }));

      return {
        period: period ? `${dateLabel(period.startsOn)} → ${dateLabel(period.endsOn)}` : "no open period",
        totalHours: totalHours.toFixed(1),
        overtimeHours: otHours.toFixed(1),
        estimatedPayrollCost: fmtMoney(cost),
        flaggedTimesheets: flagged,
        pendingTimeOff, pendingExpenses, kudosCount, openShifts,
        topByHours: top,
      };
    }

    case "list_pending_approvals": {
      const [timeOff, expenses, flagged, drafts] = await Promise.all([
        prisma.timeOffRequest.findMany({
          where: { member: { organizationId: orgId }, status: "pending" },
          include: { member: { include: { user: true } } }, take: 20,
        }),
        prisma.expenseRequest.findMany({
          where: { member: { organizationId: orgId }, status: "pending" },
          include: { member: { include: { user: true } } }, take: 20,
        }),
        prisma.timesheetEntry.findMany({
          where: { OR: [{ flagged: true }, { approved: false }], member: { organizationId: orgId } },
          include: { member: { include: { user: true } } }, take: 20,
        }),
        prisma.shift.count({ where: { status: "draft", location: { organizationId: orgId } } }),
      ]);
      return {
        timeOff: timeOff.map(r => ({ id: r.id, name: r.member.user.name, from: dateLabel(r.startsOn), to: dateLabel(r.endsOn), category: r.category, reason: r.reason })),
        expenses: expenses.map(r => ({ id: r.id, name: r.member.user.name, amount: fmtMoney(r.amount, r.currency), category: r.category, notes: r.notes })),
        timesheetIssues: flagged.map(e => ({ id: e.id, name: e.member.user.name, date: dateLabel(e.date), hours: e.hours, flagged: e.flagged, approved: e.approved })),
        unpublishedShifts: drafts,
      };
    }

    case "send_message": {
      const m = await findMemberByName(orgId, input.toMemberName);
      if (!m) return { error: `Member not found: ${input.toMemberName}` };
      const msg = await prisma.message.create({ data: { fromId: user.memberId, toId: m.id, body: input.body } });
      return { sent: true, to: m.user.name, body: input.body, messageId: msg.id };
    }

    case "send_kudos": {
      const m = await findMemberByName(orgId, input.toMemberName);
      if (!m) return { error: `Member not found: ${input.toMemberName}` };
      const k = await prisma.kudos.create({
        data: { fromId: user.memberId, toId: m.id, message: input.message, emoji: input.emoji ?? "🙌" },
      });
      return { posted: true, to: m.user.name, message: input.message, emoji: k.emoji };
    }

    case "auto_offer_shift": {
      if (!isManager(user)) return forbid();
      const wave = (input.wave ?? 1) as 1 | 2 | 3;
      try {
        const { ranked } = await rankForShift(input.shiftId, orgId);
        const plan = WAVES[wave];
        const chosen = ranked.slice(0, plan.size);
        if (chosen.length === 0) return { error: "No eligible candidates" };
        const offers = await sendOffers({
          shiftId: input.shiftId, organizationId: orgId, fromMemberId: user.memberId, wave,
          candidates: chosen.map(c => ({ memberId: c.id, rationale: c.rationale })),
        });
        return {
          sent: offers.length, wave, expiresAt: offers[0].expiresAt,
          offered: chosen.map(c => ({ name: c.name, score: Math.round(c.score), rationale: c.rationale })),
        };
      } catch (e: any) {
        return { error: e.message ?? "auto-offer failed" };
      }
    }

    case "check_compliance": {
      const from = input.from ? new Date(input.from) : addDays(startOfWeek(new Date()), -7);
      const to   = input.to   ? new Date(input.to)   : addDays(startOfWeek(new Date()), 14);
      const [shifts, members, settings] = await Promise.all([
        prisma.shift.findMany({
          where: { location: { organizationId: orgId }, startsAt: { gte: from, lt: to }, memberId: { not: null } },
        }),
        prisma.member.findMany({ where: { organizationId: orgId }, include: { user: true } }),
        getOrCreateComplianceSettings(orgId),
      ]);
      const violations = checkCompliance({
        shifts: shifts.map(s => ({ id: s.id, memberId: s.memberId, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status })),
        members: members.map(m => ({ id: m.id, name: m.user.name })),
        settings,
      });
      return {
        from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10),
        settings,
        summary: {
          total: violations.length,
          errors:   violations.filter(v => v.severity === "error").length,
          warnings: violations.filter(v => v.severity === "warning").length,
        },
        violations: violations.slice(0, 25).map(v => ({
          rule: v.ruleLabel, severity: v.severity, member: v.memberName,
          message: v.message, recommendation: v.recommendation,
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
