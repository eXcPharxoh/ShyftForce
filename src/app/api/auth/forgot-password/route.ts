import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import { Email, sendEmail } from "@/lib/email";
import { z } from "zod";

const Schema = z.object({ email: z.string().email().toLowerCase().trim() });

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true }); // never leak whether email exists

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Always respond OK to prevent email enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = randomBytes(32).toString("hex");
  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600 * 1000) },
  });
  await sendEmail({
    to: user.email,
    subject: "Reset your shyftforce password",
    html: Email.resetPassword({ name: user.name, token }),
  });
  return NextResponse.json({ ok: true });
}
