import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { z } from "zod";
import { audit } from "@/lib/audit";

const Schema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Org scope check via member.organizationId
  const existing = await prisma.expenseRequest.findFirst({
    where: { id, member: { organizationId: u.organizationId } },
    select: { id: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const r = await prisma.expenseRequest.update({ where: { id }, data: { status: parsed.data.status } });
    if (existing.status !== parsed.data.status) {
      await audit({
        organizationId: u.organizationId, actorId: u.id,
        action: parsed.data.status === "approved" ? "expense.approve" : parsed.data.status === "rejected" ? "expense.reject" : "expense.create",
        entityType: "ExpenseRequest", entityId: id,
        metadata: { from: existing.status, to: parsed.data.status },
      });
    }
    return NextResponse.json(r);
  } catch (e: any) {
    console.error("expense PATCH failed", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
