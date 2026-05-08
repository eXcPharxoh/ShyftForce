import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const Schema = z.object({
  startsOn: z.string(),
  endsOn: z.string(),
  category: z.string().default("vacation"),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const r = await prisma.timeOffRequest.create({
    data: {
      memberId: u.memberId,
      startsOn: new Date(parsed.data.startsOn),
      endsOn: new Date(parsed.data.endsOn),
      category: parsed.data.category,
      reason: parsed.data.reason,
    },
  });
  return NextResponse.json(r);
}
