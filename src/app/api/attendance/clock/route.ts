import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(req: Request) {
  const u = await requireUser();
  const { memberId, type } = await req.json();
  if (!memberId || !type) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (memberId !== u.memberId && u.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!["clock_in", "clock_out", "break_start", "break_end"].includes(type)) return NextResponse.json({ error: "bad type" }, { status: 400 });
  const log = await prisma.attendanceLog.create({ data: { memberId, type } });
  return NextResponse.json(log);
}
