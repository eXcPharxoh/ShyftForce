import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const u = await requireUser();
  const logs = await prisma.attendanceLog.findMany({
    where: { member: { organizationId: u.organizationId } },
    orderBy: { at: "asc" },
  });
  const status = new Map<string, "in" | "break" | "out">();
  for (const l of logs) {
    if (l.type === "clock_in") status.set(l.memberId, "in");
    else if (l.type === "break_start") status.set(l.memberId, "break");
    else if (l.type === "break_end") status.set(l.memberId, "in");
    else if (l.type === "clock_out") status.set(l.memberId, "out");
  }
  return NextResponse.json({
    working: [...status.values()].filter(v => v === "in").length,
    onBreak: [...status.values()].filter(v => v === "break").length,
    lateOrAbsent: 0,
  });
}
