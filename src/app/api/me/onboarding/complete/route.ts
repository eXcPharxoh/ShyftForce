// Marks the current employee's first-time onboarding as complete and saves the
// pieces of profile they entered in the wizard (phone for SMS shift offers).
// The (app) layout redirects EMPLOYEE users with onboardingAt = null to
// /welcome, so flipping this timestamp lets them through to the app.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const Schema = z.object({
  phone: z.string().max(40).nullable().optional(),
  smsOptIn: z.boolean().optional(),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const data: any = { onboardingAt: new Date() };
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone?.trim() || null;
  if (parsed.data.smsOptIn !== undefined) data.smsOptIn = parsed.data.smsOptIn;

  await prisma.member.update({ where: { id: u.memberId }, data });
  return NextResponse.json({ ok: true });
}
