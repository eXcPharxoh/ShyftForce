import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "@/lib/session";
import { findAvailableWorkers } from "@/lib/network/profile";
import { prisma } from "@/lib/prisma";

// GET /api/network/workers?city=&skill=
// Manager-only: browse discoverable workers from across the network.
export async function GET(req: Request) {
  const u = await requireManagerOrAdmin();
  const url = new URL(req.url);
  const city = url.searchParams.get("city") || null;
  const skill = url.searchParams.get("skill") || null;

  // Exclude the org's own users from the network browse
  const ownMembers = await prisma.member.findMany({
    where: { organizationId: u.organizationId },
    select: { userId: true },
  });
  const ownUserIds = ownMembers.map((m) => m.userId);

  const workers = await findAvailableWorkers({ city, skill, excludeUserIds: ownUserIds, limit: 50 });

  return NextResponse.json({
    workers: workers.map((w) => ({
      id: w.id,
      name: w.user.name,
      avatar: w.user.avatar,
      bio: w.bio,
      city: w.city,
      stateRegion: w.stateRegion,
      skills: w.skills ? safeJsonParse(w.skills) : [],
      reputationScore: w.reputationScore,
      totalShiftsCompleted: w.totalShiftsCompleted,
      totalEmployers: w.totalEmployers,
    })),
  });
}

function safeJsonParse(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
