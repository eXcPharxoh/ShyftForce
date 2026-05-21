import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";
import { ensureDefaultPolicies, hoursForRequest } from "@/lib/pto/service";
import { audit } from "@/lib/audit";

const Schema = z.object({
  startsOn: z.string(),
  endsOn:   z.string(),
  category: z.string().default("vacation"),
  reason:   z.string().optional(),
  acknowledgeBlackout: z.boolean().optional(),
});

export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await ensureDefaultPolicies(u.organizationId);
  const policy = await prisma.ptoPolicy.findUnique({
    where: { organizationId_category: { organizationId: u.organizationId, category: parsed.data.category } },
  });
  const startsOn = new Date(parsed.data.startsOn);
  const endsOn   = new Date(parsed.data.endsOn);
  const hoursRequested = hoursForRequest(startsOn, endsOn, policy?.hoursPerDay ?? 8);

  // ── Blackout-window validation ──────────────────────────────────────────
  // Hard blackouts refuse the request outright. Soft/warn blackouts allow it
  // but surface a flag/warning for the manager (and the requester on first
  // submit). The member's home location scopes which blackouts apply.
  let memberLocationId: string | null = null;
  if (u.memberId) {
    const m = await prisma.member.findUnique({
      where: { id: u.memberId },
      select: { locationId: true },
    });
    memberLocationId = m?.locationId ?? null;
  }

  const blackouts = await prisma.timeOffBlackout.findMany({
    where: {
      organizationId: u.organizationId,
      startsOn: { lte: endsOn },
      endsOn:   { gte: startsOn },
      OR: [
        { locationId: null },
        ...(memberLocationId ? [{ locationId: memberLocationId }] : []),
      ],
    },
    select: { id: true, name: true, mode: true, startsOn: true, endsOn: true },
  });

  const hard = blackouts.find(b => b.mode === "hard");
  if (hard) {
    return NextResponse.json({
      error: `This window is blacked out: ${hard.name}. Please contact a manager.`,
      code: "blackout_hard",
      blackout: { name: hard.name, startsOn: hard.startsOn, endsOn: hard.endsOn },
    }, { status: 409 });
  }

  const soft = blackouts.filter(b => b.mode === "soft" || b.mode === "warn");
  // Warn-mode: ask for explicit acknowledgement on first submit.
  if (soft.some(b => b.mode === "warn") && !parsed.data.acknowledgeBlackout) {
    const w = soft.find(b => b.mode === "warn")!;
    return NextResponse.json({
      error: `Heads up: ${w.name} overlaps your dates — approval is less likely. Resubmit to acknowledge.`,
      code: "blackout_warn",
      blackout: { name: w.name, startsOn: w.startsOn, endsOn: w.endsOn },
    }, { status: 409 });
  }

  const r = await prisma.timeOffRequest.create({
    data: {
      memberId: u.memberId,
      startsOn, endsOn,
      category: parsed.data.category,
      reason:   parsed.data.reason,
      hoursRequested,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "time_off.create", entityType: "TimeOffRequest", entityId: r.id,
    metadata: {
      category: parsed.data.category,
      hoursRequested,
      ...(soft.length ? { blackoutFlags: soft.map(b => ({ name: b.name, mode: b.mode })) } : {}),
    },
  });
  return NextResponse.json({ ...r, blackoutFlags: soft.length ? soft.map(b => ({ name: b.name, mode: b.mode })) : undefined });
}
