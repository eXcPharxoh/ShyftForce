import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { recordPredictabilityIfOwed } from "@/lib/compliance/predictability";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";

function combine(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi]    = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const body = await req.json() as {
    date?: string; startTime?: string; endTime?: string;
    position?: string; notes?: string; status?: string;
    memberId?: string | null; isOpen?: boolean;
  };

  // Org check
  const existing = await prisma.shift.findUnique({ where: { id }, include: { location: true, member: true } });
  if (!existing || existing.location.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: any = {};
  if (body.date && body.startTime) {
    data.startsAt = combine(body.date, body.startTime);
    if (body.endTime) {
      let end = combine(body.date, body.endTime);
      if (end <= data.startsAt) end = new Date(end.getTime() + 24*3600*1000);
      data.endsAt = end;
    }
  }
  if (body.position !== undefined) data.position = body.position || null;
  if (body.notes !== undefined)    data.notes = body.notes || null;
  if (body.status && ["draft", "published"].includes(body.status)) data.status = body.status;
  if (body.memberId !== undefined) {
    data.memberId = body.memberId || null;
    data.isOpen = !body.memberId;
  }
  if (body.isOpen !== undefined) data.isOpen = body.isOpen;

  const updated = await prisma.shift.update({ where: { id }, data });

  // Predictability pay if a published shift was moved/shortened/reassigned inside the lead window
  if (existing.status === "published" && existing.memberId) {
    const settings = await getOrCreateComplianceSettings(u.organizationId);
    if (settings.predictabilityPayEnabled) {
      let changeType: "moved" | "shortened" | "canceled" | null = null;
      if (data.startsAt && +data.startsAt !== +existing.startsAt) changeType = "moved";
      else if (data.endsAt && +data.endsAt < +existing.endsAt) changeType = "shortened";
      else if (data.memberId !== undefined && data.memberId !== existing.memberId) changeType = "canceled";
      if (changeType) {
        await recordPredictabilityIfOwed({
          organizationId: u.organizationId,
          shiftId: id,
          memberId: existing.memberId,
          changeType,
          shiftStartsAt: existing.startsAt,
          hourlyRate: existing.member?.hourlyRate ?? 0,
          jurisdiction: settings.jurisdiction ?? "default",
          reason: `manager edit by ${u.name}`,
        }).catch((e) => console.error("predictability record failed:", e));
      }
    }
  }

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.update", entityType: "Shift", entityId: id, metadata: data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.shift.findUnique({ where: { id }, include: { location: true, member: true } });
  if (!existing || existing.location.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Predictability pay: deletion of a published shift inside the lead window is a "canceled" event
  if (existing.status === "published" && existing.memberId) {
    const settings = await getOrCreateComplianceSettings(u.organizationId);
    if (settings.predictabilityPayEnabled) {
      await recordPredictabilityIfOwed({
        organizationId: u.organizationId,
        shiftId: id,
        memberId: existing.memberId,
        changeType: "canceled",
        shiftStartsAt: existing.startsAt,
        hourlyRate: existing.member?.hourlyRate ?? 0,
        jurisdiction: settings.jurisdiction ?? "default",
        reason: `manager delete by ${u.name}`,
      }).catch((e) => console.error("predictability record failed:", e));
    }
  }

  await prisma.shift.delete({ where: { id } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "shift.delete", entityType: "Shift", entityId: id,
  });
  return NextResponse.json({ ok: true });
}
