// Public kiosk clock-in/out. Authenticated by the kiosk DEVICE token, not by
// a user session. Employee authenticates by PIN. Only allows members assigned
// to the kiosk's location (or no location), and only emits "clock_in" /
// "clock_out" / break events.
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const Schema = z.object({
  pin:  z.string().regex(/^\d{4,6}$/),
  type: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
}).strict();

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Kiosk not paired" }, { status: 401 });

  const device = await prisma.kioskDevice.findUnique({
    where: { token },
    include: { location: true, organization: true },
  });
  if (!device || device.revokedAt) return NextResponse.json({ error: "Kiosk session invalid" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Find candidates: members of this org with a PIN set. We check each PIN
  // server-side because we can't index a hashed PIN. Bounded by org member
  // count (10s–100s), so the linear scan is fine.
  const candidates = await prisma.member.findMany({
    where: {
      organizationId: device.organizationId,
      status: "active",
      kioskPinHash: { not: null },
    },
    include: { user: { select: { name: true } }, location: true },
  });

  let matched = null as null | typeof candidates[number];
  for (const m of candidates) {
    if (await bcrypt.compare(parsed.data.pin, m.kioskPinHash!)) { matched = m; break; }
  }
  if (!matched) return NextResponse.json({ error: "PIN not recognized" }, { status: 401 });

  // If the matched member is bound to a specific location, it must match this
  // kiosk's location (or null = floats between sites).
  if (matched.locationId && matched.locationId !== device.locationId) {
    return NextResponse.json({
      error: `${matched.user.name} is assigned to a different location. Punch in there or ask your manager.`,
    }, { status: 403 });
  }

  // Record the attendance log
  const log = await prisma.attendanceLog.create({
    data: {
      memberId: matched.id,
      type: parsed.data.type,
      locationId: device.locationId,
      verified: true, // kiosk implies on-site (the device is at the location)
    },
  });

  // Touch kiosk lastSeen
  await prisma.kioskDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });

  await audit({
    organizationId: device.organizationId, actorId: null,
    action: "shift.claim", entityType: "AttendanceLog", entityId: log.id,
    metadata: { via: "kiosk", kioskDeviceId: device.id, memberName: matched.user.name, type: parsed.data.type },
  });

  return NextResponse.json({
    ok: true,
    memberName: matched.user.name,
    type: parsed.data.type,
    at: log.at,
    locationName: device.location.name,
  });
}
