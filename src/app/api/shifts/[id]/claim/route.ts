import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { claimShift } from "@/lib/marketplace/service";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  try {
    const shift = await claimShift(id, u.memberId, u.organizationId);
    // Notify all managers in this org via DM (single batched insert)
    const managers = await prisma.member.findMany({
      where: {
        organizationId: u.organizationId,
        role: { in: ["MANAGER", "ADMIN"] },
        id: { not: u.memberId },
      },
      select: { id: true },
    });
    if (managers.length > 0) {
      const startStr = shift!.startsAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const body = `✅ ${u.name} claimed the open shift at ${shift!.location.name} on ${startStr}.`;
      await prisma.message.createMany({
        data: managers.map(mgr => ({ fromId: u.memberId, toId: mgr.id, body })),
      });
    }
    return NextResponse.json({ ok: true, shift });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Could not claim" }, { status: 409 });
  }
}
