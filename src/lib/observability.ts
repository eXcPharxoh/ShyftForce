/**
 * Observability shim. Every callsite goes through captureException /
 * captureMessage / trackEvent so we can wire in a real backend later without
 * touching call sites.
 *
 * **Current behavior:** structured `console.error` / `console.info`. That's it.
 * There is no Sentry integration wired in. If you want errors aggregated in a
 * dashboard you must either:
 *   1. `npm i @sentry/nextjs`, add `sentry.{client,server}.config.ts`, and
 *      replace the bodies here with `Sentry.captureException(...)` etc., OR
 *   2. Point your hosting platform's log drain at console output (Vercel /
 *      Fly / Render all stream `console.*` to a queryable log UI).
 *
 * Setting `SENTRY_DSN` alone does NOT turn anything on. We log a one-time
 * warning the first time a capture happens while DSN is set, so an operator
 * who set the env var and assumed it was working sees the gap immediately.
 *
 * Environment:
 *   SENTRY_DSN            — only used for the "you set this but it's not wired" warning
 *   NEXT_PUBLIC_SENTRY_DSN— same, client-side
 *   NEXT_PUBLIC_ANALYTICS — flip trackEvent on/off in dev without losing the wiring
 */

const SERVER_DSN  = process.env.SENTRY_DSN ?? "";
const CLIENT_DSN  = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
const ANALYTICS_ON = (process.env.NEXT_PUBLIC_ANALYTICS ?? "1") !== "0";

const isServer = typeof window === "undefined";
const dsnSetButNotWired = isServer ? !!SERVER_DSN : !!CLIENT_DSN;

let warnedAboutDsn = false;
function warnIfMisconfigured() {
  if (dsnSetButNotWired && !warnedAboutDsn) {
    warnedAboutDsn = true;
    console.warn(
      "[obs] SENTRY_DSN is set but @sentry/nextjs is not installed/wired. " +
      "Errors are being written to console only. See src/lib/observability.ts."
    );
  }
}

type Severity = "fatal" | "error" | "warning" | "info" | "debug";

/** Capture an exception. Writes to structured console; no remote sink wired. */
export function captureException(err: unknown, context?: Record<string, unknown>) {
  warnIfMisconfigured();
  const tag = isServer ? "[obs:server]" : "[obs:client]";
  if (err instanceof Error) {
    console.error(tag, err.message, { stack: err.stack, ...context });
  } else {
    console.error(tag, err, context);
  }
}

/** Capture a non-error message at a given severity. Console-only. */
export function captureMessage(message: string, level: Severity = "info", context?: Record<string, unknown>) {
  warnIfMisconfigured();
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
