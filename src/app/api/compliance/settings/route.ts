import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";

export async function PATCH(req: Request) {
  const u = await requireManagerOrAdmin();
  await getOrCreateComplianceSettings(u.organizationId); // ensure exists
  const body = await req.json();
  const allowed = [
    "maxWeeklyHours", "maxDailyHours", "minRestGapHours",
    "mealBreakRequiredAfterHours", "maxConsecutiveDays",
    "predictiveSchedulingDays", "jurisdiction",
  ] as const;
  const data: any = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  const updated = await prisma.complianceSettings.update({
    where: { organizationId: u.organizationId },
    data,
  });
  return NextResponse.json(updated);
}
