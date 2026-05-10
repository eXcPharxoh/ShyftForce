import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { distanceMeters } from "@/lib/geo";

type Body = {
  memberId: string;
  type: "clock_in" | "clock_out" | "break_start" | "break_end";
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  photoData?: string;       // data URL ("data:image/jpeg;base64,...")
};

export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json() as Body;
  const { memberId, type, latitude, longitude, accuracyMeters, photoData } = body;

  if (!memberId || !type) return NextResponse.json({ error: "missing fields" }, { status: 400 });
  if (memberId !== u.memberId && u.role === "EMPLOYEE") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!["clock_in", "clock_out", "break_start", "break_end"].includes(type)) {
    return NextResponse.json({ error: "bad type" }, { status: 400 });
  }

  // Look up member's assigned location for geofence check
  const member = await prisma.member.findUnique({ where: { id: memberId }, include: { location: true } });
  if (!member || member.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "member not found" }, { status: 404 });
  }

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
}
