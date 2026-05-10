import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addDays, startOfWeek } from "@/lib/utils";

// GET /api/forecast?location=<id>&weekStart=YYYY-MM-DD
// Returns the saved per-30min forecast slots for one location for the requested week.
export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("location");
  if (!locationId) return NextResponse.json({ error: "location required" }, { status: 400 });

  const weekStartStr = url.searchParams.get("weekStart");
  const weekStart = weekStartStr ? new Date(`${weekStartStr}T00:00:00`) : startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);

  const loc = await prisma.location.findFirst({ where: { id: locationId, organizationId: u.organizationId } });
  if (!loc) return NextResponse.json({ error: "location not in org" }, { status: 404 });

  const slots = await prisma.demandForecast.findMany({
    where: { locationId, slotStart: { gte: weekStart, lt: weekEnd } },
    orderBy: { slotStart: "asc" },
  });

  return NextResponse.json({
    location: { id: loc.id, name: loc.name },
    weekStart: weekStart.toISOString().slice(0, 10),
    slots: slots.map((s) => ({
      slotStart: s.slotStart, slotEnd: s.slotEnd,
      predictedRevenueCents: s.predictedRevenueCents,
      predictedHeadcount: s.predictedHeadcount,
      confidence: s.confidence,
      contextNotes: s.contextNotes,
    })),
    summary: {
      totalRevenueCents: slots.reduce((a, s) => a + s.predictedRevenueCents, 0),
      totalScheduledHours: slots.reduce((a, s) => a + s.predictedHeadcount * 0.5, 0),
      generatedAt: slots[0]?.generatedAt ?? null,
    },
  });
}
