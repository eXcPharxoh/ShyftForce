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

  // Post-shift checklist gate: if clocking out, refuse if any required
  // post_shift template (for this org + applicable location) has no
  // completed instance for this member today.
  if (type === "clock_out") {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const requiredTemplates = await prisma.checklistTemplate.findMany({
      where: {
        organizationId: u.organizationId,
        active: true,
        requireCompletion: true,
        trigger: "post_shift",
        OR: [{ locationId: null }, { locationId: member.locationId ?? undefined }],
      },
      select: { id: true, name: true, positions: true },
    });
    const applicable = requiredTemplates.filter(t => {
      if (!t.positions) return true;
      try {
        const positions: string[] = JSON.parse(t.positions);
        return positions.length === 0 || (member.position && positions.includes(member.position));
      } catch { return true; }
    });
    if (applicable.length > 0) {
      const completed = await prisma.checklistInstance.findMany({
        where: {
          memberId, templateId: { in: applicable.map(t => t.id) },
          completedAt: { gte: todayStart, not: null },
        },
        select: { templateId: true },
      });
      const completedSet = new Set(completed.map(c => c.templateId));
      const missing = applicable.filter(t => !completedSet.has(t.id));
      if (missing.length > 0) {
        return NextResponse.json({
          error: `Finish your checklist${missing.length === 1 ? "" : "s"} before clocking out: ${missing.map(m => `"${m.name}"`).join(", ")}.`,
          missingChecklists: missing.map(m => ({ id: m.id, name: m.name })),
        }, { status: 409 });
      }
    }
  }

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
