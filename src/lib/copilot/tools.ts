import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { addDays, dateLabel, fmtMoney, startOfWeek, timeLabel } from "@/lib/utils";
import { checkCompliance } from "@/lib/compliance/engine";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";
import { rankForShift, sendOffers } from "@/lib/marketplace/service";
import { WAVES } from "@/lib/marketplace/ranker";
import { appUrl } from "@/lib/app-url";

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

  // -------- Vertical-specific tools --------

  // Hospitality
  {
    name: "get_room_status",
    description: "Hospitality: get hotel room status board. Returns summary (clean/dirty/cleaning/out_of_order counts) and per-room details with the current housekeeper. Optionally filter by status.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["clean", "dirty", "cleaning", "out_of_order"], description: "Filter to only this status" },
      },
    },
  },
  {
    name: "assign_room",
    description: "Hospitality: assign a housekeeper to a room (creates HotelRoomAssignment + flips room to cleaning). Manager+ only.",
    input_schema: {
      type: "object",
      properties: {
        roomNumber:      { type: "string", description: "Hotel room number, e.g. '301'" },
        housekeeperName: { type: "string", description: "Housekeeper's name" },
      },
      required: ["roomNumber", "housekeeperName"],
    },
  },
  {
    name: "list_lost_found",
    description: "Hospitality: list lost & found items. Filter by status (unclaimed | claimed | discarded) and look-back days (default 30).",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["unclaimed", "claimed", "discarded"] },
        days:   { type: "number", description: "Look-back window in days (default 30)" },
      },
    },
  },

  // Education
  {
    name: "list_open_callouts",
    description: "Education: list active substitute-teacher callouts (status=open). Returns teacher name, location, scheduled shift time, how many subs were paged, and when it expires.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "trigger_sub_callout",
    description: "Education: page substitute teachers for a specific teacher's next upcoming shift. Manager+ only. The system finds matched subs by subjects/grades and SMS-pages them with first-respond-wins claim links.",
    input_schema: {
      type: "object",
      properties: {
        teacherName: { type: "string", description: "Name of the teacher who called out (matched by substring)" },
        subjects:    { type: "array", items: { type: "string" }, description: "Subjects to filter the pool by, e.g. ['Math', 'Science']" },
        grades:      { type: "array", items: { type: "string" } },
        notes:       { type: "string", description: "Free-text included in the SMS to subs" },
      },
      required: ["teacherName"],
    },
  },

  // Retail
  {
    name: "list_open_vm_tasks",
    description: "Retail: list open visual-merchandising tasks. Returns name, assignee, due date, and overdue flag.",
    input_schema: { type: "object", properties: {} },
  },

  // Grocery
  {
    name: "log_shrink",
    description: "Grocery: log a shrink event (lost merchandise). Manager+ only. Useful when the user says 'log $40 of strawberries spoiled in Produce'.",
    input_schema: {
      type: "object",
      properties: {
        reason:           { type: "string", enum: ["damage", "spoilage", "theft", "expired", "return", "other"] },
        productName:      { type: "string" },
        quantity:         { type: "number" },
        unitValueDollars: { type: "number", description: "Per-unit value in dollars" },
        notes:            { type: "string" },
      },
      required: ["reason", "productName"],
    },
  },

  // Construction
  {
    name: "post_safety_briefing",
    description: "Construction: post a daily safety briefing. All crew must acknowledge before clocking in. Manager+ only.",
    input_schema: {
      type: "object",
      properties: {
        topic:   { type: "string", description: "Brief title, e.g. 'Trench safety'" },
        details: { type: "string", description: "Optional longer description" },
      },
      required: ["topic"],
    },
  },

  // Fitness
  {
    name: "today_classes",
    description: "Fitness: list today's group fitness classes with instructor, time, room, and attendees.",
    input_schema: { type: "object", properties: {} },
  },

  // -------- Workforce operations (cross-vertical) --------
  {
    name: "cancel_shift",
    description: "Cancel an upcoming shift by ID. Manager+ only. If the shift is published, the system records predictability-pay impact automatically when applicable.",
    input_schema: {
      type: "object",
      properties: {
        shiftId: { type: "string" },
        reason:  { type: "string", description: "Free-text reason captured in the audit log" },
      },
      required: ["shiftId"],
    },
  },
  {
    name: "approve_timesheets",
    description: "Approve pending timesheet entries for the open pay period. Pass memberName to scope to one person, or omit to approve all unflagged entries. Manager+ only.",
    input_schema: {
      type: "object",
      properties: {
        memberName: { type: "string", description: "Restrict approval to this employee" },
        includeFlagged: { type: "boolean", description: "Approve even flagged entries (default false)" },
      },
    },
  },
  {
    name: "approve_time_off",
    description: "Approve or reject a time-off request. Manager+ only.",
    input_schema: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        decision:  { type: "string", enum: ["approve", "reject"] },
        note:      { type: "string", description: "Optional message to the requester" },
      },
      required: ["requestId", "decision"],
    },
  },
  {
    name: "list_expiring_permits",
    description: "List permits expiring within the next N days (default 30). Used to remind the manager what's coming up for renewal.",
    input_schema: {
      type: "object",
      properties: { days: { type: "number" } },
    },
  },
  {
    name: "invite_member",
    description: "Send an invitation email to a new employee. Manager+ only.",
    input_schema: {
      type: "object",
      properties: {
        email:    { type: "string" },
        name:     { type: "string" },
        role:     { type: "string", enum: ["EMPLOYEE", "MANAGER"] },
        position: { type: "string" },
      },
      required: ["email", "name"],
    },
  },
  {
    name: "set_room_status",
    description: "Hospitality: change a hotel room's status (clean / dirty / cleaning / out_of_order). Manager+ only.",
    input_schema: {
      type: "object",
      properties: {
        roomNumber: { type: "string" },
        status:     { type: "string", enum: ["clean", "dirty", "cleaning", "out_of_order"] },
      },
      required: ["roomNumber", "status"],
    },
  },
  {
    name: "book_meeting_room",
    description: "Office: book a meeting room. Conflict-checked.",
    input_schema: {
      type: "object",
      properties: {
        roomName: { type: "string" },
        date:     { type: "string", description: "YYYY-MM-DD" },
        startTime:{ type: "string", description: "HH:MM 24-hour" },
        endTime:  { type: "string", description: "HH:MM 24-hour" },
        title:    { type: "string" },
      },
      required: ["roomName", "date", "startTime", "endTime", "title"],
    },
  },
  {
    name: "log_lost_found",
    description: "Hospitality: log a lost & found item.",
    input_schema: {
      type: "object",
      properties: {
        description:   { type: "string" },
        foundLocation: { type: "string" },
      },
      required: ["description"],
    },
  },
  {
    name: "book_pt_session",
    description: "Fitness: book a personal training session for a trainer.",
    input_schema: {
      type: "object",
      properties: {
        trainerName: { type: "string" },
        clientName:  { type: "string" },
        date:        { type: "string", description: "YYYY-MM-DD" },
        startTime:   { type: "string", description: "HH:MM" },
        durationMins:{ type: "number" },
        rateDollars: { type: "number" },
      },
      required: ["trainerName", "clientName", "date", "startTime"],
    },
  },
  {
    name: "set_skill_tier",
    description: "Field service: set a member's skill tier (1=apprentice, 5=master). Affects which shifts they can be matched to.",
    input_schema: {
      type: "object",
      properties: {
        memberName: { type: "string" },
        tier:       { type: "number", description: "1 to 5" },
      },
      required: ["memberName", "tier"],
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

    case "get_room_status": {
      const rooms = await prisma.hotelRoom.findMany({
        where: { organizationId: orgId },
        include: {
          assignments: {
            where: { completedAt: null },
            include: { member: { include: { user: { select: { name: true } } } } },
            orderBy: { createdAt: "desc" }, take: 1,
          },
        },
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      });
      const summary: Record<string, number> = { clean: 0, dirty: 0, cleaning: 0, out_of_order: 0 };
      for (const r of rooms) summary[r.status] = (summary[r.status] ?? 0) + 1;
      const filter = input.status as string | undefined;
      const filtered = filter ? rooms.filter(r => r.status === filter) : rooms;
      return {
        summary,
        rooms: filtered.slice(0, 50).map(r => ({
          number: r.number, floor: r.floor, type: r.type, status: r.status,
          housekeeper: r.assignments[0]?.member.user.name ?? null,
        })),
      };
    }

    case "assign_room": {
      if (!isManager(user)) return forbid();
      const room = await prisma.hotelRoom.findFirst({
        where: { number: input.roomNumber, organizationId: orgId },
      });
      if (!room) return { error: `Room ${input.roomNumber} not found` };
      const housekeeper = await findMemberByName(orgId, input.housekeeperName);
      if (!housekeeper) return { error: `Member not found: ${input.housekeeperName}` };
      await prisma.hotelRoomAssignment.create({
        data: { hotelRoomId: room.id, memberId: housekeeper.id, startedAt: new Date() },
      });
      await prisma.hotelRoom.update({ where: { id: room.id }, data: { status: "cleaning" } });
      return { ok: true, room: room.number, housekeeper: input.housekeeperName };
    }

    case "list_lost_found": {
      const items = await prisma.lostFoundItem.findMany({
        where: {
          organizationId: orgId,
          ...(input.status ? { status: input.status } : {}),
          foundAt: { gte: addDays(new Date(), -(input.days ?? 30)) },
        },
        orderBy: { foundAt: "desc" }, take: 25,
      });
      return {
        items: items.map(i => ({
          description: i.description, location: i.foundLocation,
          status: i.status, foundAt: dateLabel(i.foundAt),
          claimedBy: i.claimedBy,
        })),
      };
    }

    case "list_open_callouts": {
      const callouts = await prisma.subCallout.findMany({
        where: { organizationId: orgId, status: "open" },
        include: {
          shift: { include: { member: { include: { user: true } }, location: true } },
          offers: true,
        },
        orderBy: { createdAt: "desc" }, take: 20,
      });
      return {
        callouts: callouts.map(c => ({
          id: c.id,
          teacher: c.shift.member?.user.name ?? "(unassigned)",
          location: c.shift.location.name,
          startsAt: dateLabel(c.shift.startsAt),
          subsPaged: c.offers.length,
          expiresAt: c.expiresAt.toISOString(),
        })),
      };
    }

    case "trigger_sub_callout": {
      if (!isManager(user)) return forbid();
      const shift = await prisma.shift.findFirst({
        where: { location: { organizationId: orgId }, member: { user: { name: { contains: input.teacherName } } }, startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        include: { member: { include: { user: true } }, location: true },
      });
      if (!shift) return { error: `No upcoming shift found for "${input.teacherName}"` };
      const { startCallout } = await import("@/lib/education/sub-callout");
      try {
        const callout = await startCallout({
          organizationId: orgId, shiftId: shift.id,
          triggeredById:  user.memberId,
          subjects: input.subjects ?? [],
          grades:   input.grades ?? [],
          notes:    input.notes ?? null,
          baseUrl:  appUrl(),
        });
        return {
          ok: true, teacher: shift.member?.user.name,
          shiftAt: dateLabel(shift.startsAt),
          subsPaged: callout.offers.length,
          expiresAt: callout.expiresAt.toISOString(),
        };
      } catch (e: any) { return { error: e.message }; }
    }

    case "list_open_vm_tasks": {
      const tasks = await prisma.vmTask.findMany({
        where: { organizationId: orgId, status: "open" },
        include: { assignedTo: { include: { user: true } } },
        orderBy: { dueDate: "asc" }, take: 30,
      });
      const now = new Date();
      return {
        tasks: tasks.map(t => ({
          name: t.name,
          assignedTo: t.assignedTo?.user.name ?? "(unassigned)",
          dueDate: t.dueDate ? dateLabel(t.dueDate) : null,
          overdue: t.dueDate ? t.dueDate < now : false,
          requirePhoto: t.requirePhoto,
        })),
      };
    }

    case "log_shrink": {
      if (!isManager(user)) return forbid();
      const total = Math.round((input.unitValueDollars ?? 0) * 100 * (input.quantity ?? 1));
      const e = await prisma.shrinkEvent.create({
        data: {
          organizationId: orgId,
          reportedById:   user.memberId ?? null,
          reason:         input.reason,
          productName:    input.productName,
          quantity:       input.quantity ?? 1,
          unitValueCents: Math.round((input.unitValueDollars ?? 0) * 100),
          totalValueCents: total,
          notes:          input.notes ?? null,
        },
      });
      return { ok: true, id: e.id, valueDollars: total / 100 };
    }

    case "post_safety_briefing": {
      if (!isManager(user)) return forbid();
      const b = await prisma.safetyBriefing.create({
        data: {
          organizationId: orgId, postedById: user.memberId ?? null,
          topic: input.topic, details: input.details ?? null,
        },
      });
      return { ok: true, id: b.id, topic: b.topic };
    }

    case "today_classes": {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 86400_000);
      const items = await prisma.classOccurrence.findMany({
        where: { fitnessClass: { organizationId: orgId }, startsAt: { gte: today, lt: tomorrow } },
        include: { fitnessClass: true, instructor: { include: { user: true } } },
        orderBy: { startsAt: "asc" },
      });
      return {
        classes: items.map(o => ({
          name: o.fitnessClass.name,
          instructor: o.instructor.user.name,
          startsAt: timeLabel(o.startsAt),
          room: o.room,
          status: o.status,
          attendees: `${o.attendees}/${o.fitnessClass.capacity}`,
        })),
      };
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

    // -------- Workforce operations (cross-vertical) --------

    case "cancel_shift": {
      if (!isManager(user)) return forbid();
      const shift = await prisma.shift.findFirst({
        where: { id: input.shiftId, location: { organizationId: orgId } },
        select: { id: true, status: true },
      });
      if (!shift) return { error: "Shift not found" };
      await prisma.shift.delete({ where: { id: shift.id } });
      return { ok: true, shiftId: shift.id, reason: input.reason ?? null };
    }

    case "approve_timesheets": {
      if (!isManager(user)) return forbid();
      const period = await prisma.payPeriod.findFirst({
        where: { organizationId: orgId, status: "open" },
        select: { id: true },
      });
      if (!period) return { error: "No open pay period." };
      const where: any = { payPeriodId: period.id, approved: false };
      if (input.memberName) {
        const m = await findMemberByName(orgId, input.memberName);
        if (!m) return { error: `Member not found: ${input.memberName}` };
        where.memberId = m.id;
      }
      if (!input.includeFlagged) where.flagged = false;
      const r = await prisma.timesheetEntry.updateMany({ where, data: { approved: true } });
      return { ok: true, approvedCount: r.count };
    }

    case "approve_time_off": {
      if (!isManager(user)) return forbid();
      const req = await prisma.timeOffRequest.findFirst({
        where: { id: input.requestId, member: { organizationId: orgId } },
        select: { id: true },
      });
      if (!req) return { error: "Request not found" };
      const status = input.decision === "approve" ? "approved" : "rejected";
      await prisma.timeOffRequest.update({ where: { id: req.id }, data: { status } });
      return { ok: true, status };
    }

    case "list_expiring_permits": {
      const days = input.days ?? 30;
      const horizon = addDays(new Date(), days);
      const items = await prisma.permit.findMany({
        where: { organizationId: orgId, expiresOn: { lte: horizon, gte: new Date() } },
        include: { member: { include: { user: true } } },
        orderBy: { expiresOn: "asc" }, take: 25,
      }).catch(() => [] as any[]);
      return {
        items: items.map((p: any) => ({
          category: p.category,
          owner: p.member?.user.name ?? "(agency-level)",
          expiresOn: dateLabel(p.expiresOn),
          daysLeft: Math.ceil((+p.expiresOn - +new Date()) / 86400_000),
        })),
      };
    }

    case "invite_member": {
      if (!isManager(user)) return forbid();
      // Defer to existing invitation flow — we just create the record.
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) return { error: `User already exists with email ${input.email}` };
      const inv = await prisma.invitation.create({
        data: {
          organizationId: orgId,
          email: input.email,
          role: input.role ?? "EMPLOYEE",
          token: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
          expiresAt: addDays(new Date(), 14),
        },
      });
      return { ok: true, invitationId: inv.id, note: "Invitation created. Email pipeline should now send." };
    }

    case "set_room_status": {
      if (!isManager(user)) return forbid();
      const room = await prisma.hotelRoom.findFirst({ where: { number: input.roomNumber, organizationId: orgId } });
      if (!room) return { error: `Room ${input.roomNumber} not found` };
      await prisma.hotelRoom.update({ where: { id: room.id }, data: { status: input.status } });
      return { ok: true, room: room.number, status: input.status };
    }

    case "book_meeting_room": {
      if (!user.memberId) return { error: "Not a member" };
      const room = await prisma.meetingRoom.findFirst({ where: { name: { contains: input.roomName }, organizationId: orgId, active: true } });
      if (!room) return { error: `Room not found: ${input.roomName}` };
      const startsAt = combineDateTime(input.date, input.startTime);
      const endsAt   = combineDateTime(input.date, input.endTime);
      // Conflict check
      const conflict = await prisma.meetingRoomBooking.findFirst({
        where: { meetingRoomId: room.id, AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }] },
      });
      if (conflict) return { error: "Conflicts with another booking" };
      const b = await prisma.meetingRoomBooking.create({
        data: { meetingRoomId: room.id, organizerId: user.memberId, startsAt, endsAt, title: input.title },
      });
      return { ok: true, bookingId: b.id };
    }

    case "log_lost_found": {
      const item = await prisma.lostFoundItem.create({
        data: {
          organizationId: orgId,
          description: input.description,
          foundLocation: input.foundLocation ?? null,
          loggedById: user.memberId ?? null,
        },
      });
      return { ok: true, itemId: item.id };
    }

    case "book_pt_session": {
      if (!user.memberId && !isManager(user)) return forbid();
      const trainer = await findMemberByName(orgId, input.trainerName);
      if (!trainer) return { error: `Trainer not found: ${input.trainerName}` };
      const startsAt = combineDateTime(input.date, input.startTime);
      const endsAt   = new Date(startsAt.getTime() + (input.durationMins ?? 60) * 60_000);
      const s = await prisma.ptSession.create({
        data: {
          organizationId: orgId, trainerMemberId: trainer.id,
          clientName: input.clientName, startsAt, endsAt,
          rateCents: Math.round((input.rateDollars ?? 0) * 100),
        },
      });
      return { ok: true, sessionId: s.id };
    }

    case "set_skill_tier": {
      if (!isManager(user)) return forbid();
      const m = await findMemberByName(orgId, input.memberName);
      if (!m) return { error: `Member not found: ${input.memberName}` };
      if (input.tier < 1 || input.tier > 5) return { error: "Tier must be 1-5" };
      await prisma.member.update({ where: { id: m.id }, data: { skillTier: input.tier } });
      return { ok: true, member: m.user.name, tier: input.tier };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
