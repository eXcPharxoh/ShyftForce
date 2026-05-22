import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { recordPredictabilityIfOwed } from "@/lib/compliance/predictability";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";
import { smsScheduleChange } from "@/lib/sms";
import { emitWebhook } from "@/lib/webhooks/emit";
import { memberHasExpiredBlockingPermit } from "@/lib/permits/service";
import { checkRatioForShift } from "@/lib/healthcare/ratios";

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
    // Vertical-specific fields
    departmentId?:      string | null; // grocery/retail
    crewId?:            string | null; // construction
    classPeriodId?:     string | null; // education
    modMemberId?:       string | null; // hospitality
    unit?:              string | null; // healthcare
    requiredSkillTier?: number | null; // field service
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

  // Vertical-specific field updates. We accept null to clear.
  if (body.departmentId !== undefined)      data.departmentId      = body.departmentId  || null;
  if (body.crewId !== undefined)            data.crewId            = body.crewId        || null;
  if (body.classPeriodId !== undefined)     data.classPeriodId     = body.classPeriodId || null;
  if (body.modMemberId !== undefined)       data.modMemberId       = body.modMemberId   || null;
  if (body.unit !== undefined)              data.unit              = body.unit          || null;
  if (body.requiredSkillTier !== undefined) data.requiredSkillTier = body.requiredSkillTier ?? null;

  // Cross-tenant guards: any referenced ID must belong to this org.
  if (data.departmentId) {
    const d = await prisma.department.findFirst({ where: { id: data.departmentId, organizationId: u.organizationId }, select: { id: true } });
    if (!d) return NextResponse.json({ error: "Department not in org" }, { status: 404 });
  }
  if (data.crewId) {
    const c = await prisma.crew.findFirst({ where: { id: data.crewId, organizationId: u.organizationId }, select: { id: true } });
    if (!c) return NextResponse.json({ error: "Crew not in org" }, { status: 404 });
  }
  if (data.classPeriodId) {
    const p = await prisma.classPeriod.findFirst({ where: { id: data.classPeriodId, organizationId: u.organizationId }, select: { id: true } });
    if (!p) return NextResponse.json({ error: "Class period not in org" }, { status: 404 });
  }
  if (data.modMemberId) {
    const m = await prisma.member.findFirst({ where: { id: data.modMemberId, organizationId: u.organizationId }, select: { id: true } });
    if (!m) return NextResponse.json({ error: "MOD member not in org" }, { status: 404 });
  }
  // Primary assignee must belong to this org (guards the assignment itself, and
  // makes the skill-tier/permit findUnique lookups below safe).
  if (body.memberId) {
    const m = await prisma.member.findFirst({ where: { id: body.memberId, organizationId: u.organizationId }, select: { id: true } });
    if (!m) return NextResponse.json({ error: "Member not in org" }, { status: 404 });
  }

  // Compliance block: refuse to assign a member whose mandatory permit is
  // currently expired. Manager can either renew the permit or toggle
  // blocksScheduling=false on that permit if they're knowingly making an
  // exception (e.g. permit physically renewed, paperwork pending).
  if (body.memberId && await memberHasExpiredBlockingPermit(body.memberId)) {
    return NextResponse.json({
      error: "This member has an expired permit that blocks scheduling. Renew the permit in Settings → Permits, or mark it as non-blocking.",
      blockedByPermit: true,
    }, { status: 409 });
  }

  // Skill tier match: if the shift has a requiredSkillTier and the assigned
  // member's tier is lower, refuse. Manager can either un-set the requirement
  // or pick a higher-tier tech.
  if (body.memberId && existing.requiredSkillTier) {
    const m = await prisma.member.findUnique({
      where: { id: body.memberId },
      select: { skillTier: true, user: { select: { name: true } } },
    });
    if (m && (m.skillTier ?? 0) < existing.requiredSkillTier) {
      return NextResponse.json({
        error: `${m.user.name} is tier ${m.skillTier ?? "unranked"} — this shift requires tier ${existing.requiredSkillTier}+.`,
        blockedBySkillTier: true,
      }, { status: 409 });
    }
  }

  // Healthcare patient-ratio check (warn-only by default — refuse only when
  // EVERY rule is breached). We pass the union of existing values + the
  // requested change so we evaluate the post-update state.
  if (body.memberId && (existing.unit ?? null)) {
    const m = await prisma.member.findUnique({
      where: { id: body.memberId },
      select: { role: true },
    });
    const role = (m?.role as any) ?? "RN";
    if (["RN", "LPN", "CNA"].includes(role)) {
      const violations = await checkRatioForShift({
        organizationId: u.organizationId,
        shiftId:        id,
        locationId:     existing.locationId,
        unit:           existing.unit,
        startsAt:       data.startsAt ?? existing.startsAt,
        endsAt:         data.endsAt   ?? existing.endsAt,
        memberRole:     role,
        adding:         true,
      });
      if (violations.length > 0) {
        return NextResponse.json({
          error: `Patient-ratio rule would be violated. ${violations[0].message}`,
          ratioViolations: violations,
        }, { status: 409 });
      }
    }
  }

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

  // Notify the assigned member by SMS if the time or assignee changed
  if (existing.status === "published" && existing.member?.phone) {
    const moved    = data.startsAt && +data.startsAt !== +existing.startsAt;
    const changed  = data.memberId !== undefined && data.memberId !== existing.memberId;
    if (moved || changed) {
      smsScheduleChange({
        organizationId: u.organizationId,
        memberId: existing.memberId!,
        phone: existing.member.phone,
        changeType: changed ? "canceled" : "moved",
        position: existing.position ?? "Shift",
        locationName: existing.location.name,
        startsAt: updated.startsAt,
        url: "https://app.shyftforce.com/schedule",
      }).catch(() => {});
    }
  }

  emitWebhook({
    organizationId: u.organizationId,
    event: "shift.updated",
    data: { id: updated.id, status: updated.status, memberId: updated.memberId, startsAt: updated.startsAt, endsAt: updated.endsAt },
  }).catch(() => {});

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
