// Assign a vehicle to a shift. One vehicle per shift (model has unique).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const UpsertSchema = z.object({
  shiftId:                   z.string().min(1),
  vehicleId:                 z.string().min(1),
  memberId:                  z.string().min(1),
  startMileage:              z.number().int().min(0).max(1_000_000).nullable().optional(),
  endMileage:                z.number().int().min(0).max(1_000_000).nullable().optional(),
  preTripChecklistInstanceId: z.string().nullable().optional(),
}).strict();

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = UpsertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Cross-tenant: all three must be in org
  const [shift, vehicle, member] = await Promise.all([
    prisma.shift.findFirst({ where: { id: parsed.data.shiftId, location: { organizationId: u.organizationId } }, select: { id: true, memberId: true } }),
    prisma.vehicle.findFirst({ where: { id: parsed.data.vehicleId, organizationId: u.organizationId, status: "active" }, select: { id: true } }),
    prisma.member.findFirst({ where: { id: parsed.data.memberId, organizationId: u.organizationId }, select: { id: true } }),
  ]);
  if (!shift)   return NextResponse.json({ error: "Shift not in org" }, { status: 404 });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not active or not in org" }, { status: 404 });
  if (!member)  return NextResponse.json({ error: "Member not in org" }, { status: 404 });
  // Sanity: assigned member should match shift's member (if shift has one)
  if (shift.memberId && shift.memberId !== parsed.data.memberId) {
    return NextResponse.json({ error: "Vehicle assignee must match the shift's assigned member" }, { status: 400 });
  }

  const assignment = await prisma.vehicleAssignment.upsert({
    where:  { shiftId: parsed.data.shiftId },
    create: { ...parsed.data, startMileage: parsed.data.startMileage ?? null, endMileage: parsed.data.endMileage ?? null, preTripChecklistInstanceId: parsed.data.preTripChecklistInstanceId ?? null },
    update: { vehicleId: parsed.data.vehicleId, memberId: parsed.data.memberId, startMileage: parsed.data.startMileage ?? undefined, endMileage: parsed.data.endMileage ?? undefined },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "VehicleAssignment", entityId: assignment.id,
    metadata: { shiftId: parsed.data.shiftId, vehicleId: parsed.data.vehicleId },
  });
  return NextResponse.json({ ok: true, assignment });
}
