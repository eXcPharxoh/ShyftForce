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
    // Vertical-specific records
    departmentMemberships, laneAssignments, shrinkEvents, vmTaskAssignments,
    vmTaskSubmissions, lpEventsReported, hotDeskBookings, meetingRoomBookings,
    visitorHostings, classOccurrencesAsInstructor, ptSessionsAsTrainer,
    crewMemberships, crewsAsForeman, equipmentAssignments, safetyBriefingsPosted,
    safetyBriefingAcks, hotelRoomAssignments, lostFoundLogged,
    subPoolMembership, conferenceSlots, conferenceBookings,
    onCallShifts, vehicleAssignments, jobCloseouts,
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
    // Vertical-specific
    prisma.departmentMembership.findMany({ where: { memberId } }),
    prisma.laneAssignment.findMany({ where: { memberId } }),
    prisma.shrinkEvent.findMany({ where: { reportedById: memberId } }),
    prisma.vmTask.findMany({ where: { assignedToMemberId: memberId } }),
    prisma.vmTaskSubmission.findMany({ where: { memberId } }),
    prisma.lossPreventionEvent.findMany({ where: { reportedById: memberId } }),
    prisma.hotDeskBooking.findMany({ where: { memberId } }),
    prisma.meetingRoomBooking.findMany({ where: { organizerId: memberId } }),
    prisma.visitor.findMany({ where: { hostMemberId: memberId } }),
    prisma.classOccurrence.findMany({ where: { instructorMemberId: memberId } }),
    prisma.ptSession.findMany({ where: { trainerMemberId: memberId } }),
    prisma.crewMembership.findMany({ where: { memberId } }),
    prisma.crew.findMany({ where: { foremanId: memberId } }),
    prisma.equipmentAssignment.findMany({ where: { memberId } }),
    prisma.safetyBriefing.findMany({ where: { postedById: memberId } }),
    prisma.safetyBriefingAck.findMany({ where: { memberId } }),
    prisma.hotelRoomAssignment.findMany({ where: { memberId } }),
    prisma.lostFoundItem.findMany({ where: { loggedById: memberId } }),
    prisma.subPoolMember.findUnique({ where: { memberId } }),
    prisma.conferenceSlot.findMany({ where: { teacherMemberId: memberId } }),
    prisma.conferenceBooking.findMany({ where: { bookedById: memberId } }),
    prisma.onCallShift.findMany({ where: { memberId } }),
    prisma.vehicleAssignment.findMany({ where: { memberId } }),
    prisma.jobCloseout.findMany({ where: { memberId } }),
  ]) : [
    [], [], [], [], [], [], [], [], [], [], [], [],
    [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
    [], [], null, [], [], [], [], [],
  ];

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
    // Vertical-specific tables (per RFC: surface every personal-data table)
    verticalData: {
      departmentMemberships, laneAssignments, shrinkEvents,
      vmTasksAssignedToYou: vmTaskAssignments, vmTaskSubmissions,
      lossPreventionEventsReported: lpEventsReported,
      hotDeskBookings, meetingRoomBookings,
      visitorsYouHosted: visitorHostings,
      classOccurrencesAsInstructor, ptSessionsAsTrainer,
      crewMemberships, crewsAsForeman,
      equipmentAssignments, safetyBriefingsYouPosted: safetyBriefingsPosted, safetyBriefingAcks,
      hotelRoomAssignments, lostFoundItemsLogged: lostFoundLogged,
      subPoolMembership, conferenceSlots, conferenceBookings,
      onCallShifts, vehicleAssignments, jobCloseouts,
    },
  };

  const json = JSON.stringify(exported);
  return { payload: exported, sizeBytes: Buffer.byteLength(json, "utf8") };
}
