import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireManagerOrAdmin();
  const { id } = await params;
  const { status } = await req.json();
  if (!["pending", "approved", "rejected"].includes(status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
  const r = await prisma.timeOffRequest.update({ where: { id }, data: { status } });
  return NextResponse.json(r);
}
