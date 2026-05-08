import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(req: Request) {
  const u = await requireUser();
  const { toId, message, emoji } = await req.json();
  if (!toId || !message) return NextResponse.json({ error: "missing" }, { status: 400 });
  const k = await prisma.kudos.create({ data: { fromId: u.memberId, toId, message, emoji } });
  return NextResponse.json(k);
}
