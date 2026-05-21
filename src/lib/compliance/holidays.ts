// Statutory / public holidays per jurisdiction.
// Used by:
//   - the schedule grid to flag holiday days (1.5x pay reminder)
//   - the predictability-pay engine (some holidays are exemptions)
//   - the auto-PTO blackout / time-off blackout calendar

export type Holiday = {
  date: string; // YYYY-MM-DD
  name: string;
  /** Premium pay multiplier (e.g. 1.5 = time-and-a-half). Null = no premium required. */
  premiumMultiplier?: number | null;
  /** Localized name when applicable */
  nameFr?: string;
};

/** Return statutory holidays for a jurisdiction in a given calendar year.
 *  Math derives moveable dates (Good Friday, Patriots' Day, Labour Day, etc).
 */
export function holidaysForJurisdiction(jurisdictionId: string, year: number): Holiday[] {
  switch (jurisdictionId) {
    case "quebec":             return quebecHolidays(year);
    case "ontario":            return ontarioHolidays(year);
    case "british_columbia":   return bcHolidays(year);
    case "default":
    case "california":
    case "los_angeles":
    case "san_francisco":
    case "emeryville":
    case "berkeley":
    case "new_york_city":
    case "new_york_state_retail":
    case "seattle":
    case "chicago":
    case "philadelphia":
    case "oregon":
      return usFederalHolidays(year);
    default:
      return [];
  }
}

// ─── Moveable date helpers ───────────────────────────────────────────────────

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function iso(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * 86400_000); }
function nthDayOfMonth(year: number, monthIdx: number, dayOfWeek: number, nth: number): Date {
  // First day of month
  const first = new Date(Date.UTC(year, monthIdx, 1));
  // First occurrence of dayOfWeek (0=Sun, 1=Mon...)
  const firstOccurrenceOffset = (dayOfWeek - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, monthIdx, 1 + firstOccurrenceOffset + (nth - 1) * 7));
}
function lastMondayBefore(year: number, monthIdx: number, dayOfMonth: number): Date {
  // For Patriots' Day (last Mon before May 25)
  const target = new Date(Date.UTC(year, monthIdx, dayOfMonth));
  const offset = (target.getUTCDay() + 6) % 7; // distance back to Mon
  return new Date(Date.UTC(year, monthIdx, dayOfMonth - offset - (offset === 0 ? 7 : 0)));
}

// ─── Per-jurisdiction lists ──────────────────────────────────────────────────

function quebecHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  return [
    { date: `${year}-01-01`, name: "New Year's Day",            nameFr: "Jour de l'An",                          premiumMultiplier: 1.5 },
    { date: iso(addDays(easter, -2)), name: "Good Friday",      nameFr: "Vendredi saint",                        premiumMultiplier: 1.5 },
    { date: iso(addDays(easter,  1)), name: "Easter Monday",    nameFr: "Lundi de Pâques",                       premiumMultiplier: 1.5 },
    { date: iso(lastMondayBefore(year, 4, 25)), name: "National Patriots' Day", nameFr: "Journée nationale des patriotes", premiumMultiplier: 1.5 },
    { date: `${year}-06-24`, name: "Saint-Jean-Baptiste",       nameFr: "Fête nationale du Québec",              premiumMultiplier: 1.5 },
    { date: `${year}-07-01`, name: "Canada Day",                nameFr: "Fête du Canada",                        premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 8, 1, 1)), name: "Labour Day", nameFr: "Fête du Travail",                    premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 9, 1, 2)), name: "Thanksgiving", nameFr: "Action de grâce",                  premiumMultiplier: 1.5 },
    { date: `${year}-12-25`, name: "Christmas Day",             nameFr: "Noël",                                  premiumMultiplier: 1.5 },
  ];
}

function ontarioHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  return [
    { date: `${year}-01-01`, name: "New Year's Day", premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 1, 1, 3)), name: "Family Day", premiumMultiplier: 1.5 },
    { date: iso(addDays(easter, -2)), name: "Good Friday", premiumMultiplier: 1.5 },
    { date: iso(lastMondayBefore(year, 4, 25)), name: "Victoria Day", premiumMultiplier: 1.5 },
    { date: `${year}-07-01`, name: "Canada Day", premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 7, 1, 1)), name: "Civic Holiday", premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 8, 1, 1)), name: "Labour Day", premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 9, 1, 2)), name: "Thanksgiving", premiumMultiplier: 1.5 },
    { date: `${year}-12-25`, name: "Christmas Day", premiumMultiplier: 1.5 },
    { date: `${year}-12-26`, name: "Boxing Day",   premiumMultiplier: 1.5 },
  ];
}

function bcHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  return [
    { date: `${year}-01-01`, name: "New Year's Day", premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 1, 1, 3)), name: "Family Day", premiumMultiplier: 1.5 },
    { date: iso(addDays(easter, -2)), name: "Good Friday", premiumMultiplier: 1.5 },
    { date: iso(lastMondayBefore(year, 4, 25)), name: "Victoria Day", premiumMultiplier: 1.5 },
    { date: `${year}-07-01`, name: "Canada Day", premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 7, 1, 1)), name: "BC Day", premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 8, 1, 1)), name: "Labour Day", premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 8, 1, 4)), name: "National Day for Truth and Reconciliation", premiumMultiplier: 1.5 },
    { date: iso(nthDayOfMonth(year, 9, 1, 2)), name: "Thanksgiving", premiumMultiplier: 1.5 },
    { date: `${year}-11-11`, name: "Remembrance Day", premiumMultiplier: 1.5 },
    { date: `${year}-12-25`, name: "Christmas Day", premiumMultiplier: 1.5 },
  ];
}

function usFederalHolidays(year: number): Holiday[] {
  return [
    { date: `${year}-01-01`, name: "New Year's Day",          premiumMultiplier: null },
    { date: iso(nthDayOfMonth(year, 0, 1, 3)), name: "Martin Luther King Jr. Day", premiumMultiplier: null },
    { date: iso(nthDayOfMonth(year, 1, 1, 3)), name: "Presidents' Day",            premiumMultiplier: null },
    { date: iso(lastMondayBefore(year, 4, 31)), name: "Memorial Day",              premiumMultiplier: null },
    { date: `${year}-06-19`, name: "Juneteenth",              premiumMultiplier: null },
    { date: `${year}-07-04`, name: "Independence Day",        premiumMultiplier: null },
    { date: iso(nthDayOfMonth(year, 8, 1, 1)), name: "Labor Day", premiumMultiplier: null },
    { date: iso(nthDayOfMonth(year, 9, 1, 2)), name: "Columbus Day", premiumMultiplier: null },
    { date: `${year}-11-11`, name: "Veterans Day",            premiumMultiplier: null },
    { date: iso(nthDayOfMonth(year, 10, 4, 4)), name: "Thanksgiving Day", premiumMultiplier: null },
    { date: `${year}-12-25`, name: "Christmas Day",           premiumMultiplier: null },
  ];
}

/** Is this date a stat holiday for the org's jurisdiction? */
export function isHoliday(date: Date, jurisdictionId: string): Holiday | null {
  const iso = date.toISOString().slice(0, 10);
  const holidays = holidaysForJurisdiction(jurisdictionId, date.getUTCFullYear());
  return holidays.find(h => h.date === iso) ?? null;
}
