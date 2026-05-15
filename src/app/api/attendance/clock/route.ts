import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { distanceMeters } from "@/lib/geo";
import { z } from "zod";

const Schema = z.object({
  memberId:       z.string().min(1),
  type:           z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  latitude:       z.number().min(-90).max(90).optional(),
  longitude:      z.number().min(-180).max(180).optional(),
  accuracyMeters: z.number().min(0).max(100_000).optional(),
  photoData:      z.string().max(500_000).optional(), // data URL ("data:image/jpeg;base64,...")
}).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  const { memberId, type, latitude, longitude, accuracyMeters, photoData } = parsed.data;

  if (memberId !== u.memberId && u.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Org scope check — even managers can't punch in for members from another org.
  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: u.organizationId },
    include: { location: true },
  });
  if (!member) return NextResponse.json({ error: "member not found" }, { status: 404 });

  let distance: number | null = null;
  let withinGeofence: boolean | null = null;
  const loc = member.location;
  if (latitude != null && longitude != null && loc?.latitude != null && loc?.longitude != null) {
    distance = distanceMeters(latitude, longitude, loc.latitude, loc.longitude);
    withinGeofence = distance <= (loc.geofenceRadiusMeters ?? 100);
  }

  // Defensive: cap photo size at ~250KB encoded so we don't bloat the DB
  let photo: string | undefined = photoData;
  if (photo && photo.length > 350_000) photo = undefined;

  const verified = (latitude != null && longitude != null) && !!photo;

  try {
    const log = await prisma.attendanceLog.create({
      data: {
        memberId, type,
        latitude:       latitude       ?? null,
        longitude:      longitude      ?? null,
        accuracyMeters: accuracyMeters ?? null,
        photoData:      photo          ?? null,
        locationId:     loc?.id        ?? null,
        distanceMeters: distance,
        withinGeofence,
        verified,
      },
    });

    return NextResponse.json({
      ok: true,
      id: log.id,
      type,
      at: log.at,
      distanceMeters: distance,
      withinGeofence,
      geofenceRadiusMeters: loc?.geofenceRadiusMeters ?? null,
      verified,
    });
  } catch (e) {
    console.error("clock failed", e);
    return NextResponse.json({ error: "Clock failed" }, { status: 500 });
  }
}
