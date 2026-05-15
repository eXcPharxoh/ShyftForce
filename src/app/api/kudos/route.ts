import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const Schema = z.object({
  toId:    z.string().min(1),
  message: z.string().min(1).max(500),
  emoji:   z.string().max(8).optional().default("🙌"),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Org scope: recipient must be in the same org as sender.
  const target = await prisma.member.findFirst({
    where: { id: parsed.data.toId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  if (parsed.data.toId === u.memberId) {
    return NextResponse.json({ error: "Can't send kudos to yourself" }, { status: 400 });
  }

  try {
    const k = await prisma.kudos.create({
      data: {
        fromId: u.memberId,
        toId: parsed.data.toId,
        message: parsed.data.message,
        emoji: parsed.data.emoji ?? "🙌",
      },
    });
    return NextResponse.json(k);
  } catch (e) {
    console.error("kudos create failed", e);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
