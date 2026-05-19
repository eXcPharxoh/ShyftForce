import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const a = await prisma.stationAssignment.findFirst({
    where: { id, shift: { location: { organizationId: u.organizationId } } },
    select: { id: true },
  });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.stationAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
