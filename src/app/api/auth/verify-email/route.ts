import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const v = await prisma.emailVerification.findUnique({ where: { token }, include: { user: { include: { member: true } } } });
  if (!v) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  if (v.consumedAt) return NextResponse.json({ ok: true, alreadyVerified: true });
  if (v.expiresAt < new Date()) return NextResponse.json({ error: "Token expired" }, { status: 410 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: v.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerification.update({ where: { id: v.id }, data: { consumedAt: new Date() } }),
  ]);
  if (v.user.member) {
    await audit({
      organizationId: v.user.member.organizationId, actorId: v.userId,
      action: "user.verify_email",
    });
  }
  return NextResponse.json({ ok: true });
}
