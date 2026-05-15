// Internal company news feed — was completely unimplemented (no POST/DELETE).
// Without this the "New post" button on /billboard does nothing.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin, requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  title:    z.string().min(2).max(140),
  body:     z.string().min(2).max(8000),
  category: z.enum(["general", "schedule", "policy", "celebration", "alert"]).optional(),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.billboardPost.findMany({
    where: { organizationId: u.organizationId },
    include: { author: { include: { user: { select: { name: true, avatar: true } } } } },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const post = await prisma.billboardPost.create({
      data: {
        organizationId: u.organizationId,
        authorId: u.memberId,
        title: parsed.data.title,
        body: parsed.data.body,
        category: parsed.data.category ?? "general",
      },
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "org.update", entityType: "BillboardPost", entityId: post.id,
      metadata: { title: post.title, category: post.category },
    });
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    console.error("[billboard] create failed", e);
    return NextResponse.json({ error: "Failed to publish post" }, { status: 500 });
  }
}
