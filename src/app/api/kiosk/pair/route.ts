// Manager-side: pair a new kiosk device. Returns a long-lived bearer token
// that the kiosk device stores in localStorage and sends as Authorization
// on every clock-in request. Token is location-bound; can't be reused at
// other sites.
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const PairSchema = z.object({
  locationId: z.string().min(1),
  name:       z.string().min(2).max(80),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.kioskDevice.findMany({
    where: { organizationId: u.organizationId },
    include: { location: { select: { name: true } } },
    orderBy: { pairedAt: "desc" },
  });
  return NextResponse.json({
    items: items.map(d => ({
      id: d.id, name: d.name, locationId: d.locationId, locationName: d.location.name,
      pairedAt: d.pairedAt, lastSeenAt: d.lastSeenAt, revokedAt: d.revokedAt,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = PairSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Verify the location belongs to this org
  const loc = await prisma.location.findFirst({
    where: { id: parsed.data.locationId, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!loc) return NextResponse.json({ error: "Location not found in org" }, { status: 404 });

  const token = `sfk_${randomBytes(32).toString("base64url")}`; // sfk = shyftforce kiosk
  const device = await prisma.kioskDevice.create({
    data: {
      organizationId: u.organizationId,
      locationId: parsed.data.locationId,
      name: parsed.data.name,
      token,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "KioskDevice", entityId: device.id,
    metadata: { locationId: parsed.data.locationId, name: parsed.data.name },
  });

  // Token shown ONCE on pair — kiosk device pastes it once and stores locally.
  // Cracking the URL afterwards won't recover it.
  const origin = (process.env.NEXTAUTH_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  return NextResponse.json({
    ok: true,
    device: { id: device.id, name: device.name, locationId: device.locationId },
    token,
    kioskUrl: `${origin}/kiosk?token=${encodeURIComponent(token)}`,
    instructions: "Open this URL on the shared tablet, then bookmark / Add to Home Screen. The device stays paired until you revoke it here.",
  });
}
