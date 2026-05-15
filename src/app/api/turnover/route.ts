// GET /api/turnover  →  ranked at-risk members for this org
import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "@/lib/session";
import { scoreOrg } from "@/lib/turnover/score";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await requireManagerOrAdmin();
  const url = new URL(req.url);
  const minBand = url.searchParams.get("min") as "low" | "medium" | "high" | null;

  const all = await scoreOrg(u.organizationId);
  const threshold = minBand === "high" ? 65 : minBand === "medium" ? 35 : 0;
  return NextResponse.json({ items: all.filter(r => r.score >= threshold) });
}
