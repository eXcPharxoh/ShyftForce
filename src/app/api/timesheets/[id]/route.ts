import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { z } from "zod";
import { audit } from "@/lib/audit";

// Whitelist what managers can patch — prevents mass-assignment of arbitrary
// fields like memberId, payPeriodId, hourlyRate, etc.
const Schema = z.object({
  approved: z.boolean().optional(),
  flagged:  z.boolean().optional(),
  hours:    z.number().min(0).max(24).optional(),
  notes:    z.string().max(1000).nullable().optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  // Org scope check: only patch entries that belong to this org via member.
  const existing = await prisma.timesheetEntry.findFirst({
    where: { id, member: { organizationId: u.organizationId } },
    select: { id: true, approved: true, flagged: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const r = await prisma.timesheetEntry.update({ where: { id }, data: parsed.data });

    // Audit any state transition.
    if (parsed.data.approved === true && !existing.approved) {
      await audit({
        organizationId: u.organizationId, actorId: u.id,
        action: "timesheet.approve", entityType: "TimesheetEntry", entityId: id,
      });
    }
    if (parsed.data.flagged === true && !existing.flagged) {
      await audit({
        organizationId: u.organizationId, actorId: u.id,
        action: "timesheet.flag", entityType: "TimesheetEntry", entityId: id,
      });
    }

    return NextResponse.json(r);
  } catch (e: any) {
    console.error("timesheet PATCH failed", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
