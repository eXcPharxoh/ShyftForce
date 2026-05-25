import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { featureGuard } from "@/lib/feature-guard";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  shiftId: z.string(),
  payoutType: z.enum(["w2", "1099"]).optional().default("w2"),
  payRateOverrideCents: z.number().int().positive().nullable().optional(),
  invitedWorkerProfileId: z.string().nullable().optional(),
  message: z.string().max(500).nullable().optional(),
});

// POST /api/network/post — manager posts an open shift to the cross-employer network
export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const denied = await featureGuard(u.organizationId, "worker_network");
  if (denied) return denied;
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Verify ownership
  const shift = await prisma.shift.findFirst({
    where: { id: parsed.data.shiftId, location: { organizationId: u.organizationId } },
    include: { location: true },
  });
  if (!shift) return NextResponse.json({ error: "shift not in org" }, { status: 404 });
  if (!shift.isOpen) return NextResponse.json({ error: "shift must be open (unassigned) before posting to the network" }, { status: 400 });
  if (shift.endsAt < new Date()) return NextResponse.json({ error: "shift already ended" }, { status: 400 });

  // Don't double-post
  const existing = await prisma.networkShiftOffer.findFirst({
    where: { shiftId: parsed.data.shiftId, status: "open" },
  });
  if (existing) return NextResponse.json({ error: "already posted to network" }, { status: 400 });

  const created = await prisma.networkShiftOffer.create({
    data: {
      shiftId: parsed.data.shiftId,
      postingOrgId: u.organizationId,
      postedById: u.memberId,
      invitedWorkerId: parsed.data.invitedWorkerProfileId ?? null,
      payoutType: parsed.data.payoutType ?? "w2",
      payRateOverrideCents: parsed.data.payRateOverrideCents ?? null,
      message: parsed.data.message ?? null,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "network.post", entityType: "NetworkShiftOffer", entityId: created.id,
    metadata: { shiftId: parsed.data.shiftId, payoutType: parsed.data.payoutType, invited: !!parsed.data.invitedWorkerProfileId },
  });

  return NextResponse.json({ ok: true, offer: created });
}

// GET /api/network/post — list of network offers posted by the org (manager view)
export async function GET() {
  const u = await requireManagerOrAdmin();
  const offers = await prisma.networkShiftOffer.findMany({
    where: { postingOrgId: u.organizationId },
    include: {
      shift: { include: { location: true } },
      claimedBy: { include: { user: { select: { name: true, avatar: true } } } },
      invitedWorker: { include: { user: { select: { name: true, avatar: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ offers });
}
