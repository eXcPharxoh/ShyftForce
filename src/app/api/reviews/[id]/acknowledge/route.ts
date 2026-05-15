// Subject acknowledges they've read their review. Once acknowledged it can't
// be edited by the reviewer.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const review = await prisma.performanceReview.findFirst({
    where: { id, cycle: { organizationId: u.organizationId } },
    select: { id: true, subjectMemberId: true, submittedAt: true },
  });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (review.subjectMemberId !== u.memberId) return NextResponse.json({ error: "Only the subject can acknowledge" }, { status: 403 });
  if (!review.submittedAt) return NextResponse.json({ error: "Review hasn't been submitted yet" }, { status: 400 });

  await prisma.performanceReview.update({ where: { id }, data: { acknowledgedAt: new Date() } });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "PerformanceReview", entityId: id,
    metadata: { acknowledged: true },
  });
  return NextResponse.json({ ok: true });
}
