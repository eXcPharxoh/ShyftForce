// Receives client-side analytics events from observability.trackEvent().
// In dev / when no provider is configured this just logs them; swap the body
// to forward to Posthog/Segment when ready.
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "edge"; // tiny, lots of these — keep latency low

export async function POST(req: Request) {
  // Don't let a single client flood the endpoint.
  const ip = clientIp(req);
  const limit = rateLimit({ key: `analytics:${ip}`, max: 60, windowMs: 60_000 });
  if (!limit.allowed) return new NextResponse(null, { status: 204 });

  try {
    const data = await req.json().catch(() => null);
    if (data && typeof data === "object") {
      // TODO(analytics): forward to provider here.
      // For now just log so dev can see events firing.
      console.info("[analytics:event]", data);
    }
  } catch { /* ignore — never blow up on telemetry */ }
  return new NextResponse(null, { status: 204 });
}
