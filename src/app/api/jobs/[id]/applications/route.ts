// Applications for a single posting. GET only — applicants submit via the
// public token endpoint at /api/apply/[publicToken].
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;

  const posting = await prisma.jobPosting.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true },
  });
  if (!posting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const apps = await prisma.jobApplication.findMany({
    where: { jobPostingId: id },
    include: {
      reviewer: { include: { user: { select: { name: true } } } },
    },
    orderBy: { appliedAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    items: apps.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      resumeText: a.resumeText,
      resumeUrl: a.resumeUrl,
      coverLetter: a.coverLetter,
      source: a.source,
      status: a.status,
      reviewerName: a.reviewer?.user.name ?? null,
      notes: a.notes,
      appliedAt: a.appliedAt.toISOString(),
      reviewedAt: a.reviewedAt?.toISOString() ?? null,
      hiredAt:    a.hiredAt?.toISOString() ?? null,
      rejectedAt: a.rejectedAt?.toISOString() ?? null,
      rejectionReason: a.rejectionReason,
      invitationId: a.invitationId,
    })),
  });
}
