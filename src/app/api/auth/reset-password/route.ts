import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Schema = z.object({ token: z.string().min(20), password: z.string().min(8).max(120) });

export async function POST(req: Request) {
  // Throttle by IP so a leaked or guessed token can't be brute-forced
  // (tokens are 32 random bytes so brute force is impractical, but
  // belt-and-suspenders — and limits abuse of the /reset-password page).
  const ip = clientIp(req);
  const limit = rateLimit({ key: `reset-password:${ip}`, max: 10, windowMs: 10 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const r = await prisma.passwordReset.findUnique({ where: { token: parsed.data.token }, include: { user: { include: { member: true } } } });
  if (!r) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  if (r.consumedAt) return NextResponse.json({ error: "Token already used" }, { status: 410 });
  if (r.expiresAt < new Date()) return NextResponse.json({ error: "Token expired" }, { status: 410 });

  const hash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: r.userId }, data: { password: hash, failedLoginAttempts: 0, lockedUntil: null } }),
    prisma.passwordReset.update({ where: { id: r.id }, data: { consumedAt: new Date() } }),
    // Invalidate other unused tokens
    prisma.passwordReset.updateMany({ where: { userId: r.userId, consumedAt: null, id: { not: r.id } }, data: { consumedAt: new Date() } }),
  ]);
  if (r.user.member) {
    await audit({ organizationId: r.user.member.organizationId, actorId: r.userId, action: "user.password_reset" });
  }
  return NextResponse.json({ ok: true });
}
