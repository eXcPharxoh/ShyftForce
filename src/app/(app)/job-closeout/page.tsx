import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { JobCloseoutClient } from "@/components/job-closeout/job-closeout-client";
import { ClipboardCheck } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobCloseoutPage({ searchParams }: { searchParams: Promise<{ shift?: string }> }) {
  const u = await requireUser();
  const { shift: shiftId } = await searchParams;

  // Build list of recent + upcoming shifts assignable to me
  const where: any = {
    location: { organizationId: u.organizationId },
    startsAt: { gte: addDays(new Date(), -7), lte: addDays(new Date(), 7) },
  };
  if (u.role === "EMPLOYEE") where.memberId = u.memberId ?? "";

  const [shifts, preselected] = await Promise.all([
    prisma.shift.findMany({
      where,
      include: {
        member: { include: { user: { select: { name: true } } } },
        location: { select: { name: true } },
        jobCloseout: { select: { id: true, closedAt: true, rating: true, customerName: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 50,
    }),
    shiftId ? prisma.shift.findFirst({
      where: { id: shiftId, location: { organizationId: u.organizationId } },
      include: {
        location: { select: { name: true } },
        jobCloseout: true,
      },
    }) : null,
  ]);

  // Employees can only close their own shifts
  if (preselected && u.role === "EMPLOYEE" && preselected.memberId !== u.memberId) {
    redirect("/job-closeout");
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Field service"
        icon={ClipboardCheck}
        title="Job closeout"
        subtitle="Capture customer signature, take a finished-job photo, log parts cost, and trigger the customer email."
      />

      <JobCloseoutClient
        recentShifts={shifts.map(s => ({
          id: s.id,
          startsAt: s.startsAt.toISOString(),
          locationName: s.location.name,
          memberName: s.member?.user.name ?? null,
          position: s.position,
          closed: !!s.jobCloseout,
          closedRating: s.jobCloseout?.rating ?? null,
          closedCustomer: s.jobCloseout?.customerName ?? null,
        }))}
        preselected={preselected ? {
          id: preselected.id,
          locationName: preselected.location.name,
          startsAt: preselected.startsAt.toISOString(),
          existing: preselected.jobCloseout ? {
            customerName:   preselected.jobCloseout.customerName,
            customerEmail:  preselected.jobCloseout.customerEmail,
            rating:         preselected.jobCloseout.rating,
            notes:          preselected.jobCloseout.notes,
            partsCostCents: preselected.jobCloseout.partsCostCents,
            signatureData:  preselected.jobCloseout.signatureData,
            photoData:      preselected.jobCloseout.photoData,
          } : null,
        } : null}
      />
    </div>
  );
}
