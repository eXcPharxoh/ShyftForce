// Marks the current employee's first-time onboarding as complete and saves the
// pieces of profile they entered in the wizard (phone for SMS shift offers).
// The (app) layout redirects EMPLOYEE users with onboardingAt = null to
// /welcome, so flipping this timestamp lets them through to the app.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";

// Allow empty/null to skip; otherwise require something that looks phone-ish:
// 7+ digits after stripping common punctuation. Real validation happens at
// SMS send time (Twilio) — this just blocks "asdf" / single-digit garbage.
const phoneOk = (v: string | null | undefined) => {
  if (v == null || v === "") return true;
  const digits = v.replace(/[^\d]/g, "");
  return digits.length >= 7 && digits.length <= 15;
};

// Availability is sent as a flat list of (day × daypart × available?) cells.
// Each "unavailable" cell becomes a recurring AvailabilityRule so auto-fill
// and the AI scheduler stop assigning shifts the employee said they can't work.
const DAYPART_TIMES: Record<string, { start: string; end: string }> = {
  morning:   { start: "06:00", end: "12:00" },
  afternoon: { start: "12:00", end: "18:00" },
  evening:   { start: "18:00", end: "24:00" },
};

const Schema = z.object({
  phone: z.string().max(40).nullable().optional().refine(phoneOk, {
    message: "That doesn't look like a phone number. Skip it for now if you'd rather.",
  }),
  smsOptIn: z.boolean().optional(),
  availability: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    daypart: z.enum(["morning", "afternoon", "evening"]),
    available: z.boolean(),
  })).optional(),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.errors[0]?.message ?? "Invalid input",
    }, { status: 400 });
  }

  const data: any = { onboardingAt: new Date() };
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone?.trim() || null;
  if (parsed.data.smsOptIn !== undefined) data.smsOptIn = parsed.data.smsOptIn;

  await prisma.member.update({ where: { id: u.memberId }, data });

  // Persist unavailability as recurring rules so auto-fill / AI scheduler skip
  // those slots. We only track the CAN'T-work cells (default = available).
  if (parsed.data.availability && parsed.data.availability.length > 0) {
    // Replace this member's recurring rules from onboarding wholesale — they
    // might re-run onboarding (or we'll let them edit later in settings).
    await prisma.availabilityRule.deleteMany({
      where: { memberId: u.memberId, type: "recurring_unavailable" },
    });
    const unavailable = parsed.data.availability.filter((a) => !a.available);
    if (unavailable.length > 0) {
      await prisma.availabilityRule.createMany({
        data: unavailable.map((a) => ({
          memberId: u.memberId,
          type: "recurring_unavailable",
          dayOfWeek: a.dayOfWeek,
          startTime: DAYPART_TIMES[a.daypart].start,
          endTime:   DAYPART_TIMES[a.daypart].end,
          notes: `From welcome — ${a.daypart} unavailable.`,
        })),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
