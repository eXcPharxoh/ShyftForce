// Computes billable hours per client account from approved timesheet entries
// (or scheduled shifts if no timesheets). Used to generate client invoices.

import { prisma } from "@/lib/prisma";
import { splitOvertime } from "@/lib/payroll/overtime";

export type ClientBillingRow = {
  clientId: string;
  clientName: string;
  contactName: string | null;
  contactEmail: string | null;
  billRateCents: number;
  overtimeMultiplier: number;
  invoiceTerms: string;
  hoursRegular: number;
  hoursOvertime: number;
  subtotalCents: number;
  byLocation: { locationId: string; locationName: string; hours: number; cents: number }[];
};

export async function computeClientBilling(opts: {
  organizationId: string;
  from: Date;
  to: Date;
  source?: "timesheets" | "shifts";
}): Promise<ClientBillingRow[]> {
  const source = opts.source ?? "timesheets";

  const clients = await prisma.clientAccount.findMany({
    where: { organizationId: opts.organizationId, active: true },
    include: { locations: true },
  });
  if (clients.length === 0) return [];

  const out: ClientBillingRow[] = [];
  for (const c of clients) {
    const locIds = c.locations.map((l) => l.id);
    if (locIds.length === 0) {
      out.push({
        clientId: c.id, clientName: c.name,
        contactName: c.contactName, contactEmail: c.contactEmail,
        billRateCents: c.billRateCents, overtimeMultiplier: c.overtimeMultiplier, invoiceTerms: c.invoiceTerms,
        hoursRegular: 0, hoursOvertime: 0, subtotalCents: 0, byLocation: [],
      });
      continue;
    }

    let hoursRegular = 0;
    let hoursOvertime = 0;
    // Per-location regular/OT split so the byLocation cents include OT premium.
    const locTotals = new Map<string, { regular: number; overtime: number }>();

    // Build a flat list of {memberId, date, hours, locationId} entries, then run
    // the shared OT engine (max of daily >8h and weekly >40h, per member-week).
    let hourEntries: { memberId: string; date: Date; hours: number; locationId: string }[] = [];

    if (source === "timesheets") {
      const entries = await prisma.timesheetEntry.findMany({
        where: {
          approved: true,
          payPeriod: { organizationId: opts.organizationId },
          date: { gte: opts.from, lt: opts.to },
          member: { locationId: { in: locIds } },
        },
        include: { member: true },
      });
      hourEntries = entries
        .filter((e) => locIds.includes(e.member.locationId ?? ""))
        .map((e) => ({ memberId: e.memberId, date: new Date(e.date), hours: e.hours, locationId: e.member.locationId ?? "" }));
    } else {
      // Fall back to scheduled shifts
      const shifts = await prisma.shift.findMany({
        where: {
          locationId: { in: locIds },
          status: "published",
          startsAt: { gte: opts.from, lt: opts.to },
          memberId: { not: null },
        },
      });
      hourEntries = shifts
        .filter((s) => s.memberId)
        .map((s) => ({ memberId: s.memberId!, date: s.startsAt, hours: (+s.endsAt - +s.startsAt) / 3600_000, locationId: s.locationId }));
    }

    for (const e of splitOvertime(hourEntries)) {
      hoursRegular += e.regularHours;
      hoursOvertime += e.overtimeHours;
      const slot = locTotals.get(e.locationId) ?? { regular: 0, overtime: 0 };
      slot.regular += e.regularHours;
      slot.overtime += e.overtimeHours;
      locTotals.set(e.locationId, slot);
    }

    const subtotalCents = Math.round(
      hoursRegular * c.billRateCents +
      hoursOvertime * c.billRateCents * c.overtimeMultiplier
    );

    out.push({
      clientId: c.id, clientName: c.name,
      contactName: c.contactName, contactEmail: c.contactEmail,
      billRateCents: c.billRateCents, overtimeMultiplier: c.overtimeMultiplier, invoiceTerms: c.invoiceTerms,
      hoursRegular, hoursOvertime, subtotalCents,
      byLocation: [...locTotals.entries()].map(([id, v]) => {
        const loc = c.locations.find((l) => l.id === id);
        const cents = Math.round(v.regular * c.billRateCents + v.overtime * c.billRateCents * c.overtimeMultiplier);
        return { locationId: id, locationName: loc?.name ?? "?", hours: v.regular + v.overtime, cents };
      }),
    });
  }

  return out;
}
