import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";
import { audit } from "@/lib/audit";

const Schema = z.object({
  amount:   z.number().positive().max(1_000_000),
  category: z.string().max(60).nullable().optional(),
  notes:    z.string().max(2000).nullable().optional(),
  currency: z.string().length(3).default("USD"),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const r = await prisma.expenseRequest.create({
      data: {
        memberId: u.memberId,
        // Dual-write while readers transition from amount → amountCents.
        amount:      parsed.data.amount,
        amountCents: Math.round(parsed.data.amount * 100),
        category: parsed.data.category ?? null,
        notes:    parsed.data.notes ?? null,
        currency: parsed.data.currency,
      },
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "expense.create", entityType: "ExpenseRequest", entityId: r.id,
      metadata: { amount: parsed.data.amount, category: parsed.data.category ?? null },
    });
    return NextResponse.json(r);
  } catch (e) {
    console.error("expense create failed", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
