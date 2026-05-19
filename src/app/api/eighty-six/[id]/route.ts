// Unmark an 86'd item — kitchen restocked, item is back on.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { sendPush } from "@/lib/push";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const item = await prisma.eightySixItem.findFirst({
    where: { id, organizationId: u.organizationId },
    include: { location: { select: { id: true, name: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!item.active) return NextResponse.json({ error: "Already unmarked" }, { status: 400 });

  await prisma.eightySixItem.update({
    where: { id },
    data: { active: false, unmarkedAt: new Date(), unmarkedById: u.memberId },
  });

  // Ping on-duty members that the item is back
  const onDuty = await prisma.member.findMany({
    where: { organizationId: u.organizationId, locationId: item.locationId, status: "active" },
    include: {
      user: { select: { id: true } },
      attendanceLogs: { orderBy: { at: "desc" }, take: 1, select: { type: true } },
    },
  });
  await Promise.all(onDuty
    .filter(m => m.attendanceLogs[0] && (m.attendanceLogs[0].type === "clock_in" || m.attendanceLogs[0].type === "break_end"))
    .map(m =>
      sendPush(m.user.id, {
        title: `✅ Back on the menu: ${item.name}`,
        body:  `${item.location.name} restocked it.`,
        url:   `/eighty-six?location=${item.locationId}`,
        tag:   `86-${item.id}-back`,
      }).catch(() => {})
    ));

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "incident.update", entityType: "EightySixItem", entityId: id,
    metadata: { unmarked: item.name },
  });

  return NextResponse.json({ ok: true });
}
