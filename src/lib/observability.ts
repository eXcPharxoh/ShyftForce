/**
 * Minimal observability shim. The whole app calls captureException /
 * captureMessage / trackEvent from here — without these helpers, prod 500s
 * are invisible until someone screenshots one.
 *
 * Today: logs to console with structured prefixes.
 * Tomorrow: swap the bodies for @sentry/nextjs + posthog/segment — no caller
 * has to change.
 *
 * Environment:
 *   SENTRY_DSN            — server-side DSN; if unset, falls through to console
 *   NEXT_PUBLIC_SENTRY_DSN— client-side DSN (must be NEXT_PUBLIC_ to ship to browser)
 *   NEXT_PUBLIC_ANALYTICS — flip on/off in dev without losing the wiring
 */

const SERVER_DSN  = process.env.SENTRY_DSN ?? "";
const CLIENT_DSN  = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
const ANALYTICS_ON = (process.env.NEXT_PUBLIC_ANALYTICS ?? "1") !== "0";

const isServer = typeof window === "undefined";
const dsnConfigured = isServer ? !!SERVER_DSN : !!CLIENT_DSN;

type Severity = "fatal" | "error" | "warning" | "info" | "debug";

/** Capture an exception. Safe to call without a DSN — falls through to console. */
export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (dsnConfigured) {
    // TODO(sentry): import("@sentry/nextjs").then(s => s.captureException(err, { extra: context }))
  }
  const tag = isServer ? "[obs:server]" : "[obs:client]";
  if (err instanceof Error) {
    console.error(tag, err.message, { stack: err.stack, ...context });
  } else {
    console.error(tag, err, context);
  }
}

/** Capture a non-error message at a given severity. */
export function captureMessage(message: string, level: Severity = "info", context?: Record<string, unknown>) {
  if (dsnConfigured) {
    // TODO(sentry): import("@sentry/nextjs").then(s => s.captureMessage(message, { level, extra: context }))
  }
  const fn = level === "error" || level === "fatal" ? console.error
           : level === "warning"                    ? console.warn
           : console.info;
  fn(`[obs:${level}]`, message, context ?? "");
}

/**
 * Fire a product-analytics event. Tiny payload — name + props. Hook into
 * Segment/Posthog/Plausible by swapping the inner body. No-op when
 * NEXT_PUBLIC_ANALYTICS=0.
 */
export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (!ANALYTICS_ON) return;
  // TODO(analytics): posthog.capture(name, props) or segment.track(name, props)
  if (isServer) {
    console.info("[analytics]", name, props ?? "");
  } else {
    // Optional: send to your own /api/analytics endpoint
    try {
      navigator.sendBeacon?.(
        "/api/analytics",
        JSON.stringify({ name, props, ts: Date.now() }),
      );
    } catch {/* swallow */}
  }
}
