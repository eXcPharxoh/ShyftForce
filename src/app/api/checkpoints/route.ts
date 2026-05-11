import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin, requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";
import crypto from "crypto";

const PostSchema = z.object({
  locationId: z.string(),
  name: z.string().min(1).max(120),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  expectedSequence: z.number().int().nonnegative().optional().default(0),
});

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const locationId = url.searchParams.get("location");
  const where: any = { organizationId: u.organizationId, active: true };
  if (locationId) where.locationId = locationId;
  const posts = await prisma.checkpointPost.findMany({
    where,
    include: { location: true, scans: { orderBy: { at: "desc" }, take: 1 } },
    orderBy: [{ locationId: "asc" }, { expectedSequence: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = PostSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const loc = await prisma.location.findFirst({ where: { id: parsed.data.locationId, organizationId: u.organizationId } });
  if (!loc) return NextResponse.json({ error: "location not in org" }, { status: 404 });

  const qrToken = crypto.randomBytes(18).toString("base64url");
  const created = await prisma.checkpointPost.create({
    data: {
      organizationId: u.organizationId,
      locationId: parsed.data.locationId,
      name: parsed.data.name,
      qrToken,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      expectedSequence: parsed.data.expectedSequence ?? 0,
    },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "checkpoint.create", entityType: "CheckpointPost", entityId: created.id,
  });
  return NextResponse.json({ ok: true, post: created });
}
