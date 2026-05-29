/**
 * Single source of truth for the customer-app's public URL — used in every
 * outbound link we ship to users (SMS shift offers, push notifications,
 * email CTAs, ICS calendar feeds, etc.). Lets a deployment override the
 * hardcoded default without forking the codebase.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL  ← what we recommend setting in prod
 *   2. NEXT_PUBLIC_APP_HOST → "https://<host>" (we set this in the 3-subdomain
 *                             deploy described in .env.example)
 *   3. Hardcoded fallback   ← so the existing prod keeps working
 */
const FALLBACK = "https://app.shyftforce.com";

export function appUrl(path: string = ""): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.NEXT_PUBLIC_APP_HOST ? `https://${process.env.NEXT_PUBLIC_APP_HOST}` : "") ||
    FALLBACK;
  if (!path) return base;
  return base + (path.startsWith("/") ? path : `/${path}`);
}
