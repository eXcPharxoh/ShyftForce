// IRS Form 8027 — Employer's Annual Information Return of Tip Income and
// Allocated Tips. Required for any "large food or beverage establishment"
// (10+ tipped employees on a typical business day in food/drink service).
//
// We can't print the actual government form (which is a PDF the customer
// files), but we generate the CSV their accountant needs to fill the boxes:
//   - Line 1: Total charged tips
//   - Line 2: Total charge sales
//   - Line 3: Total credit card tips (proxy: same as charged)
//   - Line 4: Total tips reported by employees
//   - Line 5: Gross receipts from food/drink (we use POS revenue)
//   - Line 6: 8% of gross (the allocated-tips floor)
//   - Line 7: Allocation amount if reported tips < 8%
//   - Per-employee tip allocation rows
//
// Customer downloads, hands to their accountant, accountant transcribes to
// the official form. We save them the $2k-$5k of "preparing the workpaper".

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const QuerySchema = z.object({
  year:       z.coerce.number().int().min(2000).max(3000),
  locationId: z.string().optional(),
});

const FLOOR_PERCENT = 8.0; // IRS Section 6053(c) allocation floor

export async function GET(req: Request) {
  const u = await requireManagerOrAdmin();
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    year: url.searchParams.get("year"),
    locationId: url.searchParams.get("location_id") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query — pass year=YYYY" }, { status: 400 });

  const { year, locationId } = parsed.data;
  const start = new Date(year, 0, 1);
  const end   = new Date(year + 1, 0, 1);

  // Org-scope: if locationId specified, verify in-org
  const locationWhere: any = { organizationId: u.organizationId };
  if (locationId) locationWhere.id = locationId;
  const locations = await prisma.location.findMany({ where: locationWhere, select: { id: true, name: true } });
  if (locationId && locations.length === 0) {
    return NextResponse.json({ error: "Location not in org" }, { status: 404 });
  }
  const locIds = locations.map(l => l.id);

  // Gross receipts: pull from POS revenue snapshots for the year
  const posRevenue = await prisma.posRevenueSnapshot.findMany({
    where: { locationId: { in: locIds }, intervalStart: { gte: start, lt: end } },
    select: { grossSalesCents: true, netSalesCents: true },
  });
  const grossReceiptsCents = posRevenue.reduce((a, r) => a + (r.netSalesCents ?? r.grossSalesCents), 0);

  // Total tips distributed via tip pools for the year
  const tipPools = await prisma.tipPool.findMany({
    where: { locationId: { in: locIds }, date: { gte: start, lt: end } },
    include: { distributions: { include: { member: { include: { user: true } } } } },
  });
  const totalReportedTipsCents = tipPools.reduce((a, p) => a + p.totalTipsCents, 0);

  // Per-employee aggregation (used for allocation if reported < 8% floor)
  const byMember = new Map<string, { name: string; position: string | null; tipsCents: number; hours: number }>();
  for (const pool of tipPools) {
    for (const dist of pool.distributions) {
      const slot = byMember.get(dist.memberId) ?? {
        name: dist.member.user.name,
        position: dist.member.position ?? null,
        tipsCents: 0, hours: 0,
      };
      slot.tipsCents += dist.amountCents;
      slot.hours += dist.hoursWorked;
      byMember.set(dist.memberId, slot);
    }
  }

  // 8% floor + allocation calc
  const floorCents = Math.round(grossReceiptsCents * FLOOR_PERCENT / 100);
  const allocationShortfallCents = Math.max(0, floorCents - totalReportedTipsCents);

  // CSV format. Two sections: summary box-by-box, then per-employee rows.
  const csv: string[] = [];
  csv.push(`Form 8027 workpaper — ${year}`);
  csv.push(`Generated: ${new Date().toISOString()}`);
  csv.push(`Organization: ${u.organizationName}`);
  csv.push(`Location(s): ${locations.map(l => l.name).join(", ")}`);
  csv.push("");
  csv.push("Line,Box description,Amount (USD)");
  csv.push(`1,Total charged tips,${dollars(totalReportedTipsCents)}`);
  csv.push(`3,Total credit/debit card tips,${dollars(totalReportedTipsCents)}`);
  csv.push(`4,Total tips reported by employees,${dollars(totalReportedTipsCents)}`);
  csv.push(`5,Gross receipts from food/drink,${dollars(grossReceiptsCents)}`);
  csv.push(`6,8% of gross receipts (floor),${dollars(floorCents)}`);
  csv.push(`7,Allocation amount (line 6 − line 4 if positive),${dollars(allocationShortfallCents)}`);
  csv.push("");
  csv.push("Per-employee detail");
  csv.push("Member name,Position,Hours worked,Reported tips (USD),Allocation share (USD)");
  // Allocation share goes to each employee in proportion to their reported tips
  // (most common IRS-approved method — gross receipts / hours methods are also valid)
  for (const [memberId, v] of byMember) {
    const share = totalReportedTipsCents > 0 && allocationShortfallCents > 0
      ? Math.round((v.tipsCents / totalReportedTipsCents) * allocationShortfallCents)
      : 0;
    csv.push(`"${v.name}","${v.position ?? ""}",${v.hours.toFixed(2)},${dollars(v.tipsCents)},${dollars(share)}`);
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "billing.checkout", entityType: "Form8027",
    metadata: { year, locationIds: locIds, totalTipsCents: totalReportedTipsCents, grossReceiptsCents, allocationShortfallCents },
  });

  return new Response(csv.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="form-8027-${year}.csv"`,
      "Cache-Control":       "no-store",
    },
  });
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}
