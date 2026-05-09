import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock, MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { addDays, startOfWeek } from "@/lib/utils";

const MODEL = "claude-sonnet-4-6";

// Tool the model is forced to call so we get reliable structured output
const PROPOSE_TOOL: Tool = {
  name: "propose_schedule",
  description: "Submit the proposed week schedule.",
  input_schema: {
    type: "object",
    properties: {
      shifts: {
        type: "array",
        description: "Every shift to create",
        items: {
          type: "object",
          properties: {
            memberId:   { type: "string", description: "ID from the members context. Empty string for an open shift." },
            locationId: { type: "string" },
            date:       { type: "string", description: "YYYY-MM-DD" },
            startTime:  { type: "string", description: "HH:MM 24-hour" },
            endTime:    { type: "string", description: "HH:MM 24-hour" },
            position:   { type: "string" },
            rationale:  { type: "string", description: "1-line reason this assignment was made" },
          },
          required: ["memberId", "locationId", "date", "startTime", "endTime", "position"],
        },
      },
      summary:  { type: "string", description: "1-paragraph executive summary of the schedule." },
      warnings: { type: "array", items: { type: "string" }, description: "Issues you couldn't resolve (e.g. understaffed slots, no qualified employee). Each line a single issue." },
    },
    required: ["shifts", "summary"],
  },
};

type Coverage = {
  locationId: string;
  morning?:   number; // 06:00 - 14:00
  afternoon?: number; // 14:00 - 22:00
  overnight?: number; // 22:00 - 06:00
};

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  if (!process.env.SHYFTFORCE_AI_KEY) {
    return NextResponse.json({ error: "SHYFTFORCE_AI_KEY not set in .env" }, { status: 500 });
  }

  const body = await req.json() as {
    weekStart?: string;       // ISO YYYY-MM-DD; defaults to next week
    coverage:   Coverage[];   // per-location coverage requirements
    notes?:     string;       // free-text guidance
    maxHoursPerWeek?: number; // default 40
  };

  const weekStart = body.weekStart ? new Date(body.weekStart) : addDays(startOfWeek(new Date()), 7);
  weekStart.setHours(0,0,0,0);
  const weekEnd = addDays(weekStart, 7);

  // Pull context for the model
  const [locations, members, lastWeekShifts, timeOff] = await Promise.all([
    prisma.location.findMany({ where: { organizationId: u.organizationId } }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active", role: { not: "ADMIN" } },
      include: { user: true, location: true },
    }),
    prisma.shift.findMany({
      where: { location: { organizationId: u.organizationId }, startsAt: { gte: addDays(weekStart, -7), lt: weekStart }, memberId: { not: null } },
      include: { member: { include: { user: true } }, location: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.timeOffRequest.findMany({
      where: { member: { organizationId: u.organizationId }, status: "approved", startsOn: { lte: weekEnd }, endsOn: { gte: weekStart } },
    }),
  ]);

  // Compress for the model
  const memberCtx = members.map(m => ({
    id: m.id, name: m.user.name, role: m.role,
    position: m.position, location: m.location?.name ?? null,
    locationId: m.locationId, hourlyRate: m.hourlyRate,
  }));
  const lastWeekCtx = lastWeekShifts.map(s => ({
    member: s.member!.user.name, location: s.location.name, position: s.position,
    day: s.startsAt.toISOString().slice(0,10),
    start: s.startsAt.toISOString().slice(11,16), end: s.endsAt.toISOString().slice(11,16),
  }));
  const timeOffCtx = timeOff.map(r => ({
    memberId: r.memberId,
    from: r.startsOn.toISOString().slice(0,10), to: r.endsOn.toISOString().slice(0,10),
    category: r.category,
  }));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i).toISOString().slice(0,10));

  const system = `You are shyftforce's AI Auto-Scheduler. Output a complete week schedule that respects coverage requirements and constraints.

Hard rules (NEVER violate):
- Honor approved time-off (no shifts during PTO).
- One member can only be on ONE shift at a time (no overlapping).
- No member exceeds maxHoursPerWeek across the whole week.
- A member should not work back-to-back shifts that violate an 8-hour rest gap.
- If you can't fully fill a slot, mark the shift as an open shift (memberId="") instead of inventing.

Soft preferences (apply when not in conflict):
- Prefer assigning members to their home location.
- Prefer position match (e.g. "Site Manager" only assigns to manager-style shifts).
- Distribute hours fairly — avoid one person hogging 40h while another gets 5h.
- Reuse last week's patterns when reasonable (employees often prefer consistent shifts).
- Cap at 5 consecutive working days per member.

Shift time blocks:
- Morning   = 06:00–14:00
- Afternoon = 14:00–22:00
- Overnight = 22:00–06:00 (recorded under the start day)

Output only via the propose_schedule tool. Never write JSON in chat.`;

  const userPayload = {
    weekStart: weekStart.toISOString().slice(0,10),
    days,
    maxHoursPerWeek: body.maxHoursPerWeek ?? 40,
    coverage: body.coverage,
    locations: locations.map(l => ({ id: l.id, name: l.name })),
    members: memberCtx,
    lastWeekPatterns: lastWeekCtx,
    approvedTimeOff: timeOffCtx,
    extraNotes: body.notes ?? "",
  };

  const client = new Anthropic({ apiKey: process.env.SHYFTFORCE_AI_KEY });
  const messages: MessageParam[] = [{
    role: "user",
    content: `Generate the schedule for the week of ${userPayload.weekStart}. Here is the context as JSON — read carefully and respect every constraint:\n\n${JSON.stringify(userPayload, null, 2)}\n\nNow call propose_schedule with the complete week.`,
  }];

  let resp;
  try {
    resp = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system,
      tools: [PROPOSE_TOOL],
      tool_choice: { type: "tool", name: "propose_schedule" },
      messages,
    });
  } catch (e: any) {
    const msg = e?.error?.error?.message ?? e?.message ?? "AI error";
    const friendly =
      /credit balance/i.test(msg) ? "Anthropic account is out of credits — top up at console.anthropic.com → Billing." :
      /authentication|invalid api key/i.test(msg) ? "SHYFTFORCE_AI_KEY is invalid." :
      msg;
    return NextResponse.json({ error: friendly }, { status: e?.status ?? 500 });
  }

  const blocks: ContentBlock[] = resp.content as ContentBlock[];
  const toolUse = blocks.find((b: any) => b.type === "tool_use") as any;
  if (!toolUse) return NextResponse.json({ error: "AI did not return a schedule (no tool_use block)" }, { status: 502 });
  const proposal = toolUse.input as { shifts: any[]; summary: string; warnings?: string[] };

  // Hydrate names so the review UI is readable
  const memById = new Map(members.map(m => [m.id, m]));
  const locById = new Map(locations.map(l => [l.id, l]));
  const enriched = (proposal.shifts ?? []).map(s => ({
    ...s,
    memberName:   s.memberId ? memById.get(s.memberId)?.user.name ?? "(unknown)" : null,
    locationName: locById.get(s.locationId)?.name ?? "(unknown location)",
  }));

  return NextResponse.json({
    weekStart: userPayload.weekStart,
    summary: proposal.summary,
    warnings: proposal.warnings ?? [],
    shifts: enriched,
    stats: {
      totalShifts: enriched.length,
      openShifts:  enriched.filter(s => !s.memberId).length,
      hours:       enriched.reduce((a, s) => a + hoursBetween(s.startTime, s.endTime), 0),
    },
  });
}

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh*60 + em) - (sh*60 + sm);
  if (mins < 0) mins += 24*60; // overnight
  return mins / 60;
}
