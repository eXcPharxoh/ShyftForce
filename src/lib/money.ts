/**
 * Money helpers — single source of truth for the cents-vs-Float transition.
 *
 * For each column that's been duplicated (hourlyRate ↔ hourlyRateCents, etc.),
 * use `pickCents()` to read the canonical value: cents column wins; falls back
 * to Float × 100 for any row that hasn't been touched since the backfill.
 *
 * When writing, use `centsFromDollars()` to compute the new cents value AND
 * keep the legacy Float in sync (dual-write) until every reader has migrated.
 */

/** Prefer the int-cents column; fall back to the legacy Float (× 100) if null. */
export function pickCents(cents: number | null | undefined, fallbackDollars: number | null | undefined): number | null {
  if (cents != null) return Math.round(cents);
  if (fallbackDollars == null) return null;
  return Math.round(fallbackDollars * 100);
}

/** Same, but for non-nullable columns where 0 is a meaningful "no value". */
export function pickCentsOr(cents: number | null | undefined, fallbackDollars: number | null | undefined, defaultCents = 0): number {
  return pickCents(cents, fallbackDollars) ?? defaultCents;
}

/** Convert Float dollars (or null) to integer cents. */
export function dollarsToCents(d: number | null | undefined): number | null {
  if (d == null) return null;
  return Math.round(d * 100);
}

/** Convert integer cents back to a Float dollars value for the deprecated columns. */
export function centsToDollars(c: number | null | undefined): number | null {
  if (c == null) return null;
  return c / 100;
}

/**
 * Build the dual-write data object for an update that touches a money field.
 * Pass the legacy-column name and the cents-column name; this returns a
 * Prisma data slice that writes BOTH so old + new readers stay consistent.
 *
 * Example:
 *   data: {
 *     ...moneyDual("hourlyRate", "hourlyRateCents", dollars),
 *     ...otherFields,
 *   }
 */
export function moneyDual<DollarsKey extends string, CentsKey extends string>(
  dollarsKey: DollarsKey,
  centsKey: CentsKey,
  dollars: number | null | undefined,
): Record<DollarsKey | CentsKey, number | null> {
  const d = dollars == null ? null : dollars;
  const c = dollars == null ? null : Math.round(dollars * 100);
  return { [dollarsKey]: d, [centsKey]: c } as Record<DollarsKey | CentsKey, number | null>;
}
