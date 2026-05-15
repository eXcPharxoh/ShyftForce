// Browser registers its push subscription here. Idempotent on endpoint:
// re-subscribes from the same browser just refresh the auth keys.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const Schema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth:   z.string().min(10).max(200),
  }),
  userAgent: z.string().max(500).optional().nullable(),
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    update: {
      userId: u.id, // re-bind if same endpoint somehow shows up for a different user
      p256dh: parsed.data.keys.p256dh,
      auth:   parsed.data.keys.auth,
      userAgent: parsed.data.userAgent ?? null,
      lastUsedAt: null,
    },
    create: {
      userId: u.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth:   parsed.data.keys.auth,
      userAgent: parsed.data.userAgent ?? null,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { userId: u.id, endpoint } });
  return NextResponse.json({ ok: true });
}
