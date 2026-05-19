// Shift-differential pay calculator. Given a worked range (start/end) at a
// member's base hourly rate, returns a per-hour breakdown showing the
// effective rate after the highest matching differential rule applies.
//
// Rules:
//   night    — applies when the hour falls between startHour and endHour
//              (handles wrap-around past midnight: e.g. 22→06)
//   weekend  — applies on Saturday (6) or Sunday (0) by default; or specific dayOfWeek
//   holiday  — applies if the date is in holidayDates JSON array
//   custom   — same fields, manual combination

import { prisma } from "@/lib/prisma";

export type HourLine = {
  hourStart: Date;
  ruleName:  string | null;
  baseRate:  number; // dollars
  multiplier: number;
  flatAddCents: number;
  effectiveRate: number; // dollars/hr
};

export type DifferentialResult = {
  baseHours: number;
  totalCents: number;          // base × hours × multiplier + flat adds × hours
  lines: HourLine[];
};

export async function computeDifferentialPay(opts: {
  organizationId: string;
  memberId:       string;
  startsAt:       Date;
  endsAt:         Date;
  baseHourlyRateUSD: number;
}): Promise<DifferentialResult> {
  const rules = await prisma.shiftDifferential.findMany({
    where: { organizationId: opts.organizationId, active: true },
  });

  const lines: HourLine[] = [];
  let totalCents = 0;
  const hourMs = 3600_000;

  for (let t = +opts.startsAt; t < +opts.endsAt; t += hourMs) {
    const hourStart = new Date(t);
    const hourEnd = new Date(Math.min(t + hourMs, +opts.endsAt));
    const fractionOfHour = (+hourEnd - +hourStart) / hourMs;

    // Find the best (highest-multiplier) matching rule for this hour
    let best: { name: string; multiplier: number; flatAddCents: number } | null = null;
    for (const r of rules) {
      if (!ruleMatches(r, hourStart)) continue;
      if (!best || r.multiplier > best.multiplier) {
        best = { name: r.name, multiplier: r.multiplier, flatAddCents: r.flatAddCents ?? 0 };
      }
    }
    const multiplier = best?.multiplier ?? 1;
    const flatAddCents = best?.flatAddCents ?? 0;
    const effectiveRate = opts.baseHourlyRateUSD * multiplier;
    const cents = Math.round(effectiveRate * 100 * fractionOfHour) + flatAddCents * fractionOfHour;
    totalCents += cents;
    lines.push({
      hourStart, ruleName: best?.name ?? null,
      baseRate: opts.baseHourlyRateUSD, multiplier, flatAddCents,
      effectiveRate,
    });
  }

  const hours = (+opts.endsAt - +opts.startsAt) / hourMs;
  return { baseHours: hours, totalCents: Math.round(totalCents), lines };
}

function ruleMatches(rule: any, hour: Date): boolean {
  if (rule.kind === "night") {
    const h = hour.getHours();
    if (rule.startHour == null || rule.endHour == null) return false;
    if (rule.startHour < rule.endHour) {
      return h >= rule.startHour && h < rule.endHour;
    }
    // Wraps midnight
    return h >= rule.startHour || h < rule.endHour;
  }
  if (rule.kind === "weekend") {
    const dow = hour.getDay();
    return dow === 0 || dow === 6;
  }
  if (rule.kind === "holiday") {
    const iso = hour.toISOString().slice(0, 10);
    try {
      const dates: string[] = rule.holidayDates ? JSON.parse(rule.holidayDates) : [];
      return dates.includes(iso);
    } catch { return false; }
  }
  if (rule.kind === "custom") {
    // Match if any specified condition fires
    let ok = true;
    if (rule.dayOfWeek != null) ok = ok && (hour.getDay() === rule.dayOfWeek);
    if (rule.startHour != null && rule.endHour != null) {
      const h = hour.getHours();
      const inWindow = rule.startHour < rule.endHour
        ? h >= rule.startHour && h < rule.endHour
        : h >= rule.startHour || h < rule.endHour;
      ok = ok && inWindow;
    }
    return ok;
  }
  return false;
}
