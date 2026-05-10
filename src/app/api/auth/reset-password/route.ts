import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { audit } from "@/lib/audit";

const Schema = z.object({ token: z.string().min(20), password: z.string().min(8).max(120) });

export async function POST(req: Request) {
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
