import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireManagerOrAdmin } from "@/lib/session";
import { syncOrg } from "@/lib/pos/sync";

// POST /api/pos/sync — pulls fresh sales for every connected, non-manual provider
// Auth: manager OR cron (Bearer CRON_SECRET).
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && auth === `Bearer ${cronSecret}`;

  if (isCron) {
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    const results: Record<string, any> = {};
    for (const o of orgs) {
      try { results[o.id] = await syncOrg({ organizationId: o.id }); }
      catch (e: any) { results[o.id] = { error: e.message }; }
    }
    return NextResponse.json({ orgs: orgs.length, results });
  }

  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (u.role !== "ADMIN" && u.role !== "MANAGER") return NextResponse.json({ error: "manager only" }, { status: 403 });

  const result = await syncOrg({ organizationId: u.organizationId });
  return NextResponse.json(result);
}

export async function GET(req: Request) { return POST(req); }
