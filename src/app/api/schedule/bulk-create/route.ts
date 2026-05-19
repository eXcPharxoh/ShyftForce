import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { z } from "zod";
import { audit } from "@/lib/audit";

const SpecSchema = z.object({
  memberId:   z.string().nullable(),
  locationId: z.string().min(1),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime:  z.string().regex(/^\d{2}:\d{2}$/),
  endTime:    z.string().regex(/^\d{2}:\d{2}$/),
  position:   z.string().max(80),
});

const PayloadSchema = z.object({
  shifts:  z.array(SpecSchema).min(1).max(500),
  publish: z.boolean().optional(),
});

function combine(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi]    = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Verify every location AND member belongs to this org; also pre-fetch
  // the set of members whose permits are expired so we can refuse to
  // schedule them in this bulk action.
  const [locs, mems, blocked] = await Promise.all([
    prisma.location.findMany({ where: { organizationId: u.organizationId }, select: { id: true } }),
    prisma.member.findMany({ where: { organizationId: u.organizationId }, select: { id: true } }),
    (await import("@/lib/permits/service")).blockedMemberIds(u.organizationId),
  ]);
  const allowedLocs = new Set(locs.map(l => l.id));
  const allowedMems = new Set(mems.map(m => m.id));

  const rows: any[] = [];
  let rejected = 0;
  let blockedByPermit = 0;
  for (const s of parsed.data.shifts) {
    if (!allowedLocs.has(s.locationId)) { rejected++; continue; }
    if (s.memberId && !allowedMems.has(s.memberId)) { rejected++; continue; }
    if (s.memberId && blocked.has(s.memberId)) { blockedByPermit++; continue; }
    const startsAt = combine(s.date, s.startTime);
    let endsAt   = combine(s.date, s.endTime);
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24*3600*1000); // overnight
    rows.push({
      locationId: s.locationId,
      memberId:   s.memberId || null,
      startsAt, endsAt,
      position:   s.position || null,
      isOpen:     !s.memberId,
      status:     parsed.data.publish ? "published" : "draft",
    });
  }

  try {
    const result = rows.length > 0
      ? await prisma.shift.createMany({ data: rows })
      : { count: 0 };

    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: parsed.data.publish ? "shift.publish" : "shift.create",
      entityType: "Shift",
      metadata: { created: result.count, rejected, blockedByPermit },
    });

    return NextResponse.json({ created: result.count, rejected, blockedByPermit });
  } catch (e) {
    console.error("bulk-create failed", e);
    return NextResponse.json({ error: "Bulk create failed" }, { status: 500 });
  }
}
