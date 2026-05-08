import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(req: Request) {
  const u = await requireUser();
  const { toId, body } = await req.json();
  if (!toId || !body?.trim()) return NextResponse.json({ error: "missing" }, { status: 400 });
  const m = await prisma.message.create({
    data: { fromId: u.memberId, toId, body: body.trim() },
  });
  return NextResponse.json(m);
}
