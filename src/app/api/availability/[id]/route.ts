import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const existing = await prisma.availabilityRule.findUnique({ where: { id }, include: { member: true } });
  if (!existing || existing.member.organizationId !== u.organizationId) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.memberId !== u.memberId && u.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await prisma.availabilityRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
