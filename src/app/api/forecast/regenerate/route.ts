import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "@/lib/session";
import { regenerateForecast } from "@/lib/forecast/service";
import { startOfWeek } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  locationId: z.string(),
  weekStart: z.string().optional(),  // YYYY-MM-DD
  daysAhead: z.number().int().min(1).max(28).optional(),
  targetLaborPct: z.number().min(0.05).max(0.6).optional(),
  openHourLocal: z.number().int().min(0).max(23).optional(),
  closeHourLocal: z.number().int().min(1).max(24).optional(),
});

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const weekStart = parsed.data.weekStart ? new Date(`${parsed.data.weekStart}T00:00:00`) : startOfWeek(new Date());
  const result = await regenerateForecast({
    organizationId: u.organizationId,
    locationId: parsed.data.locationId,
    weekStart,
    daysAhead: parsed.data.daysAhead,
    targetLaborPct: parsed.data.targetLaborPct,
    openHourLocal: parsed.data.openHourLocal,
    closeHourLocal: parsed.data.closeHourLocal,
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "forecast.regenerate", entityType: "DemandForecast",
    metadata: { locationId: parsed.data.locationId, weekStart: weekStart.toISOString().slice(0,10), result },
  });

  return NextResponse.json({ ok: true, ...result });
}
