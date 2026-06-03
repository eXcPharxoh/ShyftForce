// Bulk location import. Same pattern as members + shifts imports.
//
// CSV columns (all optional except name):
//   name                  Display name (required)
//   address               Free-text address — server geocodes via Nominatim
//   geofenceRadiusMeters  Number, default 100
//   weeklyBudget          Dollars, optional
//   projectedRevenue      Dollars, optional
//   timezone              IANA name (e.g. "America/Chicago"), defaults to org tz
//
// Geocoding happens per row but each Nominatim call has a 1s spacing
// requirement so this can take a few seconds for large batches.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { geocodeAddress } from "@/lib/geo/geocode";

const PayloadSchema = z.object({
  rows: z.array(z.record(z.any())).min(1).max(50),
});

function pick(row: Record<string, any>, key: string): string | undefined {
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === key.toLowerCase()) {
      const v = row[k];
      return typeof v === "string" ? v.trim() : (v == null ? undefined : String(v));
    }
  }
  return undefined;
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const results: { row: number; status: "ok" | "error"; name?: string; message?: string }[] = [];
  let created = 0;

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const raw = parsed.data.rows[i];
    const name = pick(raw, "name");
    if (!name) {
      results.push({ row: i + 1, status: "error", message: "Missing 'name'" });
      continue;
    }
    const address = pick(raw, "address");
    const geofenceRadiusMeters = parseInt(pick(raw, "geofenceRadiusMeters") ?? "100", 10);
    const weeklyBudget    = parseFloat(pick(raw, "weeklyBudget") ?? "0") || null;
    const projectedRevenue = parseFloat(pick(raw, "projectedRevenue") ?? "0") || null;
    const timezone = pick(raw, "timezone");

    // Geocode (Nominatim) if address provided — wraps the existing helper which
    // already throttles + falls back silently if down.
    const geo = address ? await geocodeAddress(address).catch(() => null) : null;

    try {
      await prisma.location.create({
        data: {
          organizationId: u.organizationId,
          name,
          geofenceRadiusMeters: isNaN(geofenceRadiusMeters) ? 100 : geofenceRadiusMeters,
          weeklyBudget: weeklyBudget ?? undefined,
          projectedRevenue: projectedRevenue ?? undefined,
          ...(timezone ? { timezone } : {}),
          ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
        },
      });
      created++;
      results.push({ row: i + 1, status: "ok", name });
    } catch (e: any) {
      results.push({ row: i + 1, status: "error", name, message: e?.message ?? "Failed to create" });
    }
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Location",
    metadata: { imported: created, total: parsed.data.rows.length, source: "csv_import" },
  });

  return NextResponse.json({
    summary: {
      total:   parsed.data.rows.length,
      created,
      errors:  results.filter(r => r.status === "error").length,
    },
    results,
  });
}
