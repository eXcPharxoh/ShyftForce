// Computes billable hours per client account from approved timesheet entries
// (or scheduled shifts if no timesheets). Used to generate client invoices.

import { prisma } from "@/lib/prisma";

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

const OT_THRESHOLD_DAILY = 8;
const OT_THRESHOLD_WEEKLY = 40;

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
    const locTotals = new Map<string, { hours: number }>();

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
      // Sum hours by day per member to compute OT
      const dailyHours = new Map<string, number>(); // key memberId|date → hours
      for (const e of entries) {
        const key = `${e.memberId}|${new Date(e.date).toISOString().slice(0,10)}`;
        dailyHours.set(key, (dailyHours.get(key) ?? 0) + e.hours);
      }
      const weeklyHours = new Map<string, number>();
      for (const e of entries) {
        const d = new Date(e.date);
        const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const wkKey = `${e.memberId}|${monday.toISOString().slice(0,10)}`;
        weeklyHours.set(wkKey, (weeklyHours.get(wkKey) ?? 0) + e.hours);
      }
      for (const e of entries) {
        const memberLocId = e.member.locationId ?? "";
        if (!locIds.includes(memberLocId)) continue;
        const slot = locTotals.get(memberLocId) ?? { hours: 0 };
        slot.hours += e.hours;
        locTotals.set(memberLocId, slot);

        const dayKey = `${e.memberId}|${new Date(e.date).toISOString().slice(0,10)}`;
        const dayTotal = dailyHours.get(dayKey) ?? 0;
        const dayOT = Math.max(0, dayTotal - OT_THRESHOLD_DAILY);
        const ratio = dayOT / dayTotal || 0;
        const entryOT = e.hours * ratio;
        hoursOvertime += entryOT;
        hoursRegular += e.hours - entryOT;
      }
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
      for (const s of shifts) {
        const h = (+s.endsAt - +s.startsAt) / 3600_000;
        const slot = locTotals.get(s.locationId) ?? { hours: 0 };
        slot.hours += h;
        locTotals.set(s.locationId, slot);
        // Crude OT: anything over 8h in a shift = OT
        const dayOT = Math.max(0, h - OT_THRESHOLD_DAILY);
        hoursRegular += h - dayOT;
        hoursOvertime += dayOT;
      }
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
        return { locationId: id, locationName: loc?.name ?? "?", hours: v.hours, cents: Math.round(v.hours * c.billRateCents) };
      }),
    });
  }

  return out;
}
