import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeReputation } from "@/lib/network/profile";
import { getSessionUser } from "@/lib/session";

// POST /api/network/reputation
// - Cron (Bearer CRON_SECRET): recomputes every WorkerProfile that's been touched recently
// - Logged-in user: recomputes their own profile only
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && auth === `Bearer ${cronSecret}`;

  if (isCron) {
    const profiles = await prisma.workerProfile.findMany({
      where: {
        OR: [
          { reputationUpdatedAt: null },
          { reputationUpdatedAt: { lt: new Date(Date.now() - 24 * 3600_000) } },
        ],
      },
      select: { id: true },
      take: 500,
    });
    let ok = 0; let err = 0;
    for (const p of profiles) {
      try { await recomputeReputation(p.id); ok++; } catch { err++; }
    }
    return NextResponse.json({ scope: "cron", processed: profiles.length, ok, err });
  }

  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await prisma.workerProfile.findUnique({ where: { userId: u.id } });
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 404 });
  const updated = await recomputeReputation(profile.id);
  return NextResponse.json({ scope: "self", profile: updated });
}

export async function GET(req: Request) { return POST(req); }
