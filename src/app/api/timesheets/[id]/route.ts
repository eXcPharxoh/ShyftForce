import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireManagerOrAdmin();
  const { id } = await params;
  const data = await req.json();
  const r = await prisma.timesheetEntry.update({ where: { id }, data });
  return NextResponse.json(r);
}
