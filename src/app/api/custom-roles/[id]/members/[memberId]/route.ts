import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const u = await requireManagerOrAdmin();
  if (u.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id, memberId } = await params;
  // Cross-tenant guard
  const role = await prisma.customRole.findFirst({ where: { id, organizationId: u.organizationId }, select: { id: true } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.memberRoleAssignment.deleteMany({ where: { memberId, customRoleId: id } });
  return NextResponse.json({ ok: true });
}
