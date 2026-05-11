import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  qrToken: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  shiftId: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// Haversine distance in meters
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const post = await prisma.checkpointPost.findUnique({
    where: { qrToken: parsed.data.qrToken },
    include: { location: true },
  });
  if (!post || !post.active) return NextResponse.json({ error: "checkpoint not found or deactivated" }, { status: 404 });
  if (post.organizationId !== u.organizationId) return NextResponse.json({ error: "checkpoint belongs to another org" }, { status: 403 });

  let withinGeofence: boolean | null = null;
  if (parsed.data.latitude != null && parsed.data.longitude != null && post.latitude != null && post.longitude != null) {
    const d = distanceMeters(parsed.data.latitude, parsed.data.longitude, post.latitude, post.longitude);
    withinGeofence = d <= (post.location.geofenceRadiusMeters ?? 100);
  }

  const scan = await prisma.checkpointScan.create({
    data: {
      postId: post.id,
      memberId: u.memberId,
      shiftId: parsed.data.shiftId ?? null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      withinGeofence,
      notes: parsed.data.notes ?? null,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "checkpoint.scan", entityType: "CheckpointScan", entityId: scan.id,
    metadata: { postId: post.id, postName: post.name, withinGeofence },
  });

  return NextResponse.json({ ok: true, postName: post.name, locationName: post.location.name, withinGeofence });
}
