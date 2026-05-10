import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const Schema = z.object({
  type: z.enum(["recurring_unavailable", "one_off_unavailable"]),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  date:      z.string().optional().nullable(),
  notes:     z.string().optional().nullable(),
  memberId:  z.string().optional(),  // managers can create for others
});

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId") ?? u.memberId;
  // Allow self OR manager viewing anyone in org
  if (memberId !== u.memberId && u.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const items = await prisma.availabilityRule.findMany({
    where: { memberId },
    orderBy: [{ date: "asc" }, { dayOfWeek: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const targetId = parsed.data.memberId ?? u.memberId;
  if (targetId !== u.memberId && u.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (parsed.data.type === "recurring_unavailable" && (parsed.data.dayOfWeek == null)) {
    return NextResponse.json({ error: "dayOfWeek required for recurring rule" }, { status: 400 });
  }
  if (parsed.data.type === "one_off_unavailable" && !parsed.data.date) {
    return NextResponse.json({ error: "date required for one-off" }, { status: 400 });
  }
  const r = await prisma.availabilityRule.create({
    data: {
      memberId: targetId,
      type: parsed.data.type,
      dayOfWeek: parsed.data.dayOfWeek ?? null,
      startTime: parsed.data.startTime ?? null,
      endTime:   parsed.data.endTime   ?? null,
      date:      parsed.data.date      ? new Date(parsed.data.date) : null,
      notes:     parsed.data.notes     ?? null,
    },
  });
  return NextResponse.json(r);
}
