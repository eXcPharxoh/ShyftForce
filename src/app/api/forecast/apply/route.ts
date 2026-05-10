import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "@/lib/session";
import { applyForecastAsDraft } from "@/lib/forecast/service";
import { startOfWeek } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  locationId: z.string(),
  weekStart: z.string().optional(),
  daysAhead: z.number().int().min(1).max(28).optional(),
});

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const weekStart = parsed.data.weekStart ? new Date(`${parsed.data.weekStart}T00:00:00`) : startOfWeek(new Date());
  try {
    const result = await applyForecastAsDraft({
      organizationId: u.organizationId,
      locationId: parsed.data.locationId,
      weekStart,
      daysAhead: parsed.data.daysAhead,
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "forecast.apply", entityType: "Shift",
      metadata: { locationId: parsed.data.locationId, weekStart: weekStart.toISOString().slice(0,10), ...result },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 400 });
  }
}
