import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/session";
import { deduct, refund, hoursForRequest } from "@/lib/pto/service";
import { audit } from "@/lib/audit";
import { smsTimeOffDecision } from "@/lib/sms";
import { emitWebhook } from "@/lib/webhooks/emit";
import { sendPush } from "@/lib/push";
import { notifySlack } from "@/lib/slack";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // timeoff.approve — managers by default; custom roles can extend.
  const check = await checkPermission("timeoff.approve");
  if (!check) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ("denied" in check) return NextResponse.json({ error: "You don't have time-off approval permission." }, { status: 403 });
  const u = check.user;
  const { id } = await params;
  const { status } = await req.json();
  if (!["pending", "approved", "rejected"].includes(status)) return NextResponse.json({ error: "bad status" }, { status: 400 });

  const existing = await prisma.timeOffRequest.findUnique({
    where: { id },
    include: { member: { include: { user: true } } },
  });
  if (!existing || existing.member.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const policy = await prisma.ptoPolicy.findUnique({
    where: { organizationId_category: { organizationId: u.organizationId, category: existing.category } },
  });

  let hoursDeducted = existing.hoursDeducted;

  try {
    // Approving (was not approved): deduct
    if (status === "approved" && existing.status !== "approved" && policy) {
      const hours = existing.hoursRequested ?? hoursForRequest(existing.startsOn, existing.endsOn, policy.hoursPerDay);
      await deduct(existing.memberId, policy.id, hours);
      hoursDeducted = hours;
    }
    // Reverting from approved → not approved: refund
    if (status !== "approved" && existing.status === "approved" && policy && existing.hoursDeducted) {
      await refund(existing.memberId, policy.id, existing.hoursDeducted);
      hoursDeducted = null;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "balance update failed" }, { status: 400 });
  }

  const r = await prisma.timeOffRequest.update({
    where: { id },
    data: { status, decidedAt: new Date(), decidedById: u.id, hoursDeducted },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: status === "approved" ? "time_off.approve" : status === "rejected" ? "time_off.reject" : "time_off.create",
    entityType: "TimeOffRequest", entityId: id,
    metadata: { status, hoursDeducted },
  });

  // Notify the requester via SMS + push + webhook (all fire-and-forget)
  if (status === "approved" || status === "rejected") {
    if (existing.member.phone) {
      smsTimeOffDecision({
        organizationId: u.organizationId,
        memberId: existing.memberId,
        phone: existing.member.phone,
        decision: status,
        startsOn: existing.startsOn,
        endsOn: existing.endsOn,
      }).catch(() => {});
    }
    sendPush(existing.member.userId, {
      title: status === "approved" ? "Time off approved ✅" : "Time off rejected",
      body:  `${existing.startsOn.toLocaleDateString("en-US",{month:"short",day:"numeric"})} → ${existing.endsOn.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
      url:   "/time-off",
      tag:   `time-off-${existing.id}`,
    }).catch(() => {});
    notifySlack({
      organizationId: u.organizationId, category: "approval",
      text: `${status === "approved" ? "✅ APPROVED" : "🛑 REJECTED"} — ${existing.member.user.name}: ${existing.startsOn.toLocaleDateString("en-US",{month:"short",day:"numeric"})} → ${existing.endsOn.toLocaleDateString("en-US",{month:"short",day:"numeric"})} (${existing.category})`,
    }).catch(() => {});
  }
  emitWebhook({
    organizationId: u.organizationId,
    event: status === "approved" ? "time_off.approved" : status === "rejected" ? "time_off.rejected" : "time_off.updated",
    data: {
      id: r.id,
      memberId: existing.memberId,
      memberName: existing.member.user.name,
      startsOn: r.startsOn,
      endsOn:   r.endsOn,
      status:   r.status,
      hoursDeducted,
    },
  }).catch(() => {});

  return NextResponse.json(r);
}
