// GET /v1/shifts — list shifts in a date range, scoped to the key's org.
// POST /v1/shifts — create a single shift (requires write:shifts).
//
// Auth: Authorization: Bearer sfk_live_…
// Docs: response shapes stable across versions; never break a field.

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withApiKey } from "@/lib/api-keys";
import { emitWebhook } from "@/lib/webhooks/emit";

const CreateSchema = z.object({
  locationId: z.string(),
  memberId:   z.string().nullable().optional(),
  startsAt:   z.string().datetime(),
  endsAt:     z.string().datetime(),
  position:   z.string().max(80).optional().nullable(),
  notes:      z.string().max(2000).optional().nullable(),
  status:     z.enum(["draft", "published"]).default("draft"),
}).strict();

function serialize(s: any) {
  return {
    id: s.id, locationId: s.locationId, memberId: s.memberId,
    startsAt: s.startsAt, endsAt: s.endsAt,
    position: s.position, status: s.status, isOpen: s.isOpen, notes: s.notes,
  };
}

export const GET = withApiKey("read:shifts", async (req, { authed }) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to   = url.searchParams.get("to");
  const locationId = url.searchParams.get("location_id");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 500);

  const where: any = { location: { organizationId: authed.organizationId } };
  if (from) where.startsAt = { gte: new Date(from) };
  if (to)   where.endsAt   = { lte: new Date(to) };
  if (locationId) where.locationId = locationId;

  const shifts = await prisma.shift.findMany({
    where, orderBy: { startsAt: "asc" }, take: limit,
  });
  return Response.json({ data: shifts.map(serialize), count: shifts.length });
});

export const POST = withApiKey("write:shifts", async (req, { authed }) => {
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Cross-tenant guards
  const loc = await prisma.location.findFirst({
    where: { id: parsed.data.locationId, organizationId: authed.organizationId },
    select: { id: true },
  });
  if (!loc) return Response.json({ error: "Location not in this org" }, { status: 404 });
  if (parsed.data.memberId) {
    const m = await prisma.member.findFirst({
      where: { id: parsed.data.memberId, organizationId: authed.organizationId },
      select: { id: true },
    });
    if (!m) return Response.json({ error: "Member not in this org" }, { status: 404 });
  }

  const created = await prisma.shift.create({
    data: {
      locationId: parsed.data.locationId,
      memberId:   parsed.data.memberId ?? null,
      startsAt:   new Date(parsed.data.startsAt),
      endsAt:     new Date(parsed.data.endsAt),
      position:   parsed.data.position ?? null,
      notes:      parsed.data.notes ?? null,
      status:     parsed.data.status,
      isOpen:     !parsed.data.memberId,
    },
  });

  emitWebhook({
    organizationId: authed.organizationId,
    event: "shift.created",
    data: serialize(created),
  }).catch(() => {});

  return Response.json({ data: serialize(created) }, { status: 201 });
});
