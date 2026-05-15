import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const Schema = z.object({
  toId: z.string().min(1),
  body: z.string().min(1).max(4000),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Recipient MUST be in the same org as the sender. Without this check, any
  // authenticated user could DM members across tenants.
  const target = await prisma.member.findFirst({
    where: { id: parsed.data.toId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

  try {
    const m = await prisma.message.create({
      data: { fromId: u.memberId, toId: parsed.data.toId, body: parsed.data.body.trim() },
    });
    return NextResponse.json(m);
  } catch (e) {
    console.error("message create failed", e);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
