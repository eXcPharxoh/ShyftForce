/**
 * Tiny in-memory token-bucket-ish limiter. Keyed by an arbitrary string (caller
 * picks IP, IP+email, token, etc). Counts requests per window per key and
 * returns whether the next call is allowed.
 *
 * Single-instance only — if/when this service scales to multiple Node
 * processes, swap the Map for Redis. For now it's enough to keep an attacker
 * from running 10k signups/sec from one IP.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Returns true if the request is allowed; false if it's been throttled. */
export function rateLimit(opts: {
  key: string;
  max: number;          // max requests per window
  windowMs: number;     // window size in ms
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(opts.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    // Periodically prune. Cheap.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { allowed: true, remaining: opts.max - 1, resetAt: now + opts.windowMs };
  }
  if (existing.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count++;
  return { allowed: true, remaining: opts.max - existing.count, resetAt: existing.resetAt };
}

/** Pull a best-effort client IP from a Next request. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  return real ?? "unknown";
}
