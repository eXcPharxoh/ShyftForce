// Each member manages their own SMS preferences here. Designed to be the
// settings page back-end and a quiet-hours editor.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const PrefsSchema = z.object({
  phone:                   z.string().min(7).max(40).nullable().optional(),
  smsOptIn:                z.boolean().optional(),
  smsOptInShiftOffer:      z.boolean().optional(),
  smsOptInScheduleChange:  z.boolean().optional(),
  smsOptInTimeOff:         z.boolean().optional(),
  smsOptInAlerts:          z.boolean().optional(),
  smsQuietStartHour:       z.number().int().min(0).max(23).nullable().optional(),
  smsQuietEndHour:         z.number().int().min(0).max(23).nullable().optional(),
  locale:                  z.enum(["en", "es", "fr"]).nullable().optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const m = await prisma.member.findUnique({
    where: { id: u.memberId },
    select: {
      phone: true, locale: true,
      smsOptIn: true, smsOptInShiftOffer: true, smsOptInScheduleChange: true,
      smsOptInTimeOff: true, smsOptInAlerts: true,
      smsQuietStartHour: true, smsQuietEndHour: true,
    },
  });
  return NextResponse.json(m);
}

export async function PATCH(req: Request) {
  const u = await requireUser();
  const parsed = PrefsSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const m = await prisma.member.update({ where: { id: u.memberId }, data: parsed.data });
  return NextResponse.json({ ok: true, member: {
    phone: m.phone, locale: m.locale,
    smsOptIn: m.smsOptIn, smsOptInShiftOffer: m.smsOptInShiftOffer,
    smsOptInScheduleChange: m.smsOptInScheduleChange, smsOptInTimeOff: m.smsOptInTimeOff,
    smsOptInAlerts: m.smsOptInAlerts,
    smsQuietStartHour: m.smsQuietStartHour, smsQuietEndHour: m.smsQuietEndHour,
  } });
}
