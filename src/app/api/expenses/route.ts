import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(req: Request) {
  const u = await requireUser();
  const { amount, category, notes, currency } = await req.json();
  if (!amount || amount <= 0) return NextResponse.json({ error: "amount required" }, { status: 400 });
  const r = await prisma.expenseRequest.create({
    data: { memberId: u.memberId, amount, category, notes, currency: currency ?? "USD" },
  });
  return NextResponse.json(r);
}
