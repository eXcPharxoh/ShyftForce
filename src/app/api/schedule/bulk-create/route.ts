import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";

type Spec = {
  memberId: string | null;
  locationId: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  position: string;
};

function combine(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi]    = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const { shifts, publish } = await req.json() as { shifts: Spec[]; publish?: boolean };

  // Verify every location belongs to this org (defense)
  const locs = await prisma.location.findMany({ where: { organizationId: u.organizationId } });
  const allowedLocs = new Set(locs.map(l => l.id));

  let created = 0; let rejected = 0;
  for (const s of shifts ?? []) {
    if (!allowedLocs.has(s.locationId)) { rejected++; continue; }
    const startsAt = combine(s.date, s.startTime);
    let endsAt   = combine(s.date, s.endTime);
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24*3600*1000); // overnight
    await prisma.shift.create({
      data: {
        locationId: s.locationId,
        memberId:   s.memberId || null,
        startsAt, endsAt,
        position:   s.position || null,
        isOpen:     !s.memberId,
        status:     publish ? "published" : "draft",
      },
    });
    created++;
  }
  return NextResponse.json({ created, rejected });
}
