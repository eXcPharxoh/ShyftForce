// GDPR / CCPA / PIPEDA "Right to data portability". Builds a complete JSON
// dump of everything we hold about a user — their profile, their member
// record, their attendance logs, shifts, time-off, kudos, messages, etc.
//
// Returned as a single JSON object. For larger orgs we'd stream + zip, but
// at our scale a 1-2 MB payload is fine. Inline in DataExportRequest.payload.

import { prisma } from "@/lib/prisma";

export async function buildUserExport(userId: string): Promise<{ payload: any; sizeBytes: number }> {
  // Pull every record where userId or memberId fan in to this user.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      member: {
        include: {
          organization: { select: { id: true, name: true, slug: true, industry: true } },
          location: true,
        },
      },
      oauthIdentities: true,
      pushSubscriptions: { select: { endpoint: true, createdAt: true, lastUsedAt: true } },
      workerProfile: true,
    },
  });
  if (!user) throw new Error("User not found");

  const memberId = user.member?.id;

  const [
    attendanceLogs, shifts, timeOff, expenses, kudos, messages, swaps,
    enrollments, reviews, bids, certifications, auditLogs,
  ] = memberId ? await Promise.all([
    prisma.attendanceLog.findMany({ where: { memberId } }),
    prisma.shift.findMany({ where: { memberId } }),
    prisma.timeOffRequest.findMany({ where: { memberId } }),
    prisma.expenseRequest.findMany({ where: { memberId } }),
    prisma.kudos.findMany({ where: { OR: [{ fromId: memberId }, { toId: memberId }] } }),
    prisma.message.findMany({ where: { OR: [{ fromId: memberId }, { toId: memberId }] } }),
    prisma.shiftSwapRequest.findMany({ where: { OR: [{ requesterId: memberId }, { targetId: memberId }] } }),
    prisma.courseEnrollment.findMany({ where: { memberId }, include: { progress: true } }),
    prisma.performanceReview.findMany({ where: { OR: [{ subjectMemberId: memberId }, { reviewerMemberId: memberId }] } }),
    prisma.shiftBid.findMany({ where: { memberId } }),
    prisma.memberCertification.findMany({ where: { memberId } }),
    prisma.auditLog.findMany({ where: { actorId: userId }, take: 1000, orderBy: { createdAt: "desc" } }),
  ]) : [[], [], [], [], [], [], [], [], [], [], [], []];

  const exported = {
    exportFormat: "ShyftForce.DataExport.v1",
    exportedAt:   new Date().toISOString(),
    note:         "This is a complete dump of every record ShyftForce holds about you.",
    user: {
      id: user.id, email: user.email, name: user.name,
      avatar: user.avatar, createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      totpEnabled: user.totpEnabled,
      // Sensitive: do NOT include password hash or TOTP secret.
    },
    organization: user.member?.organization ?? null,
    member: user.member ? {
      id: user.member.id,
      role: user.member.role,
      position: user.member.position,
      hourlyRate: user.member.hourlyRate,
      hireDate: user.member.hireDate,
      birthday: user.member.birthday,
      status: user.member.status,
      phone: user.member.phone,
      emergencyContactName:  user.member.emergencyContactName,
      emergencyContactPhone: user.member.emergencyContactPhone,
      notes: user.member.notes,
      location: user.member.location,
      locale: user.member.locale,
      smsOptIn: user.member.smsOptIn,
    } : null,
    workerProfile: user.workerProfile,
    oauthIdentities: user.oauthIdentities.map(o => ({
      provider: o.provider, email: o.email, linkedAt: o.linkedAt, lastUsedAt: o.lastUsedAt,
    })),
    pushSubscriptions: user.pushSubscriptions,
    attendanceLogs, shifts, timeOff, expenses, kudos, messages, swaps,
    courseEnrollments: enrollments, performanceReviews: reviews, shiftBids: bids,
    certifications, auditLogs,
  };

  const json = JSON.stringify(exported);
  return { payload: exported, sizeBytes: Buffer.byteLength(json, "utf8") };
}
