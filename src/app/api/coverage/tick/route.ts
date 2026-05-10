import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { tickAutopilot } from "@/lib/marketplace/autopilot";

// POST /api/coverage/tick
// Advances every org's coverage state machine: expires stale offers, sends next waves,
// escalates when exhausted. Auth: any logged-in manager (own-org only) OR a cron secret
// (CRON_SECRET env var, sent as Authorization: Bearer <secret>) for the platform-wide run.
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && auth === `Bearer ${cronSecret}`;

  if (isCron) {
    // Run every org
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    const results: Record<string, any> = {};
    for (const o of orgs) {
      try {
        results[o.id] = await tickAutopilot({ organizationId: o.id });
      } catch (e: any) {
        results[o.id] = { error: e.message };
      }
    }
    return NextResponse.json({ orgs: orgs.length, results });
  }

  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (u.role !== "ADMIN" && u.role !== "MANAGER") {
    return NextResponse.json({ error: "manager only" }, { status: 403 });
  }
  const summary = await tickAutopilot({ organizationId: u.organizationId });
  return NextResponse.json(summary);
}

export async function GET(req: Request) {
  // Convenience for cron services that only do GET
  return POST(req);
}
