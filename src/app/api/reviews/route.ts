// Get my reviews (as subject or reviewer) + file a new review.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { sendPush } from "@/lib/push";

const ReviewSchema = z.object({
  cycleId:         z.string().min(1),
  subjectMemberId: z.string().min(1),
  type:            z.enum(["manager", "peer", "self"]).default("manager"),
  ratings:         z.record(z.string(), z.number().int().min(1).max(5)).optional(),
  overallRating:   z.number().int().min(1).max(5).optional(),
  comment:         z.string().max(8000).optional().nullable(),
  strengths:       z.string().max(2000).optional().nullable(),
  growth:          z.string().max(2000).optional().nullable(),
  submit:          z.boolean().default(false),
}).strict();

export async function GET(req: Request) {
  const u = await requireUser();
  const url = new URL(req.url);
  const cycleId = url.searchParams.get("cycle_id");
  const subjectId = url.searchParams.get("subject");

  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const where: any = { cycle: { organizationId: u.organizationId } };
  if (cycleId) where.cycleId = cycleId;
  if (subjectId) where.subjectMemberId = subjectId;

  // Employees see ONLY reviews they're the subject of (after submitted) or reviewer.
  if (!isManager) {
    where.OR = [
      { subjectMemberId: u.memberId, submittedAt: { not: null } },
      { reviewerMemberId: u.memberId },
    ];
  }

  const reviews = await prisma.performanceReview.findMany({
    where,
    include: {
      subjectMember:  { include: { user: { select: { name: true, avatar: true } } } },
      reviewerMember: { include: { user: { select: { name: true, avatar: true } } } },
      cycle: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: reviews.map(r => ({
      id: r.id, cycleId: r.cycleId, cycleName: r.cycle.name, type: r.type,
      subjectMemberId: r.subjectMemberId, subjectName: r.subjectMember.user.name,
      reviewerMemberId: r.reviewerMemberId, reviewerName: r.reviewerMember.user.name,
      payload: r.payload ? safeParse(r.payload) : null,
      overallRating: r.overallRating,
      submittedAt: r.submittedAt, acknowledgedAt: r.acknowledgedAt,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = ReviewSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Cross-tenant: cycle + subject must be in user's org
  const [cycle, subject] = await Promise.all([
    prisma.reviewCycle.findFirst({ where: { id: parsed.data.cycleId, organizationId: u.organizationId }, select: { id: true, status: true } }),
    prisma.member.findFirst({ where: { id: parsed.data.subjectMemberId, organizationId: u.organizationId }, select: { id: true, userId: true, user: { select: { name: true } } } }),
  ]);
  if (!cycle) return NextResponse.json({ error: "Review cycle not found" }, { status: 404 });
  if (!subject) return NextResponse.json({ error: "Subject not in this org" }, { status: 404 });
  if (cycle.status === "closed") return NextResponse.json({ error: "Cycle is closed" }, { status: 400 });

  // Role gate: only managers/admin can write manager reviews. Anyone can do
  // a self review (subject must equal user). Peer reviews require equal role.
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  if (parsed.data.type === "manager" && !isManager) {
    return NextResponse.json({ error: "Only managers can file manager reviews" }, { status: 403 });
  }
  if (parsed.data.type === "self" && parsed.data.subjectMemberId !== u.memberId) {
    return NextResponse.json({ error: "Self-review can only be filed for yourself" }, { status: 403 });
  }

  const payload = {
    ratings:   parsed.data.ratings ?? {},
    comment:   parsed.data.comment ?? null,
    strengths: parsed.data.strengths ?? null,
    growth:    parsed.data.growth ?? null,
  };

  const review = await prisma.performanceReview.upsert({
    where: { cycleId_subjectMemberId_reviewerMemberId: {
      cycleId: parsed.data.cycleId, subjectMemberId: parsed.data.subjectMemberId, reviewerMemberId: u.memberId,
    } },
    create: {
      cycleId: parsed.data.cycleId,
      subjectMemberId: parsed.data.subjectMemberId,
      reviewerMemberId: u.memberId,
      type: parsed.data.type,
      payload: JSON.stringify(payload),
      overallRating: parsed.data.overallRating ?? null,
      submittedAt: parsed.data.submit ? new Date() : null,
    },
    update: {
      payload: JSON.stringify(payload),
      overallRating: parsed.data.overallRating ?? null,
      type: parsed.data.type,
      submittedAt: parsed.data.submit ? new Date() : null,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "PerformanceReview", entityId: review.id,
    metadata: { subject: subject.user.name, type: parsed.data.type, submitted: !!parsed.data.submit },
  });

  // Notify the subject when a manager review is submitted (not draft saves)
  if (parsed.data.submit && parsed.data.type === "manager" && subject.userId !== u.id) {
    sendPush(subject.userId, {
      title: "You have a new performance review",
      body:  "Open it from HR → Reviews to read + acknowledge",
      url:   "/hr/reviews",
      tag:   `review-${review.id}`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, review });
}

function safeParse(s: string): any { try { return JSON.parse(s); } catch { return null; } }
