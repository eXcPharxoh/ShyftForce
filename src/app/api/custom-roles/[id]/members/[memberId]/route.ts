import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const u = await requireManagerOrAdmin();
  if (u.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id, memberId } = await params;
  // Cross-tenant guard
  const role = await prisma.customRole.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, name: true },
  });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await prisma.memberRoleAssignment.deleteMany({ where: { memberId, customRoleId: id } });
  // Permission changes are sensitive — audit every assignment removal so we
  // can prove "who lost access to what, and when" during incident response.
  if (result.count > 0) {
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "org.update", entityType: "MemberRoleAssignment", entityId: `${memberId}:${id}`,
      metadata: { op: "unassign_custom_role", roleName: role.name, memberId, removed: result.count },
    });
  }
  return NextResponse.json({ ok: true });
}
