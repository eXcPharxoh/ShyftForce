// Mark all messages from a specific sender as read. Without this, the
// notifications drawer and the topbar badge can never decrement, and the
// "unread" indicator on /messenger stays stuck.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const Schema = z.object({
  fromId: z.string().min(1),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // We don't need a cross-org check here — readAt is only writable on rows where
  // the recipient is the requesting user, which is org-scoped by construction.
  const result = await prisma.message.updateMany({
    where: { toId: u.memberId, fromId: parsed.data.fromId, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true, marked: result.count });
}
