// Bulk-publish all draft shifts for a given week. Without this the "Publish
// week" button on the schedule page is just decoration.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { addDays, startOfWeek } from "@/lib/utils";

const Schema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const start = parsed.data.weekStart ? new Date(parsed.data.weekStart) : startOfWeek(new Date());
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 7);

  try {
    const result = await prisma.shift.updateMany({
      where: {
        location: { organizationId: u.organizationId },
        startsAt: { gte: start, lt: end },
        status: "draft",
      },
      data: { status: "published" },
    });

    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "shift.publish", entityType: "Schedule.week",
      metadata: { weekStart: start.toISOString().slice(0, 10), published: result.count },
    });

    return NextResponse.json({ ok: true, published: result.count, weekStart: start.toISOString().slice(0, 10) });
  } catch (e) {
    console.error("[schedule/publish] failed", e);
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
