import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "@/lib/session";
import { featureGuard } from "@/lib/feature-guard";
import { computeClientBilling } from "@/lib/billing/client-hours";
import { csvResponse, toCsv } from "@/lib/csv";

// GET /api/clients/billing?from=&to=&source=timesheets|shifts&format=json|csv
export async function GET(req: Request) {
  const u = await requireManagerOrAdmin();
  const denied = await featureGuard(u.organizationId, "client_billing");
  if (denied) return denied;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to   = url.searchParams.get("to");
  const source = (url.searchParams.get("source") ?? "timesheets") as "timesheets" | "shifts";
  const format = url.searchParams.get("format") ?? "json";

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const rows = await computeClientBilling({
    organizationId: u.organizationId,
    from: from ? new Date(from) : defaultFrom,
    to: to ? new Date(to) : defaultTo,
    source,
  });

  if (format === "csv") {
    type FlatRow = { client: string; location: string; hours: string; billRate: string; subtotal: string };
    const flat: FlatRow[] = rows.flatMap((r): FlatRow[] => r.byLocation.length === 0
      ? [{ client: r.clientName, location: "—", hours: "0.00", billRate: (r.billRateCents / 100).toFixed(2), subtotal: "0.00" }]
      : r.byLocation.map((l) => ({
          client: r.clientName,
          location: l.locationName,
          hours: l.hours.toFixed(2),
          billRate: (r.billRateCents / 100).toFixed(2),
          subtotal: (l.cents / 100).toFixed(2),
        }))
    );
    const csv = toCsv(flat, ["client", "location", "hours", "billRate", "subtotal"]);
    return csvResponse(csv, `client-billing-${(from ?? defaultFrom.toISOString().slice(0,10))}.csv`);
  }

  return NextResponse.json({
    range: { from: (from ?? defaultFrom.toISOString().slice(0,10)), to: (to ?? defaultTo.toISOString().slice(0,10)) },
    source,
    rows,
    totals: {
      hoursRegular: rows.reduce((a, r) => a + r.hoursRegular, 0),
      hoursOvertime: rows.reduce((a, r) => a + r.hoursOvertime, 0),
      subtotalCents: rows.reduce((a, r) => a + r.subtotalCents, 0),
    },
  });
}
