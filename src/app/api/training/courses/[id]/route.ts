import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const course = await prisma.course.findFirst({
    where: { id, organizationId: u.organizationId },
    include: {
      lessons: { orderBy: { order: "asc" } },
      enrollments: { where: { memberId: u.memberId }, include: { progress: true } },
    },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const enrollment = course.enrollments[0] ?? null;
  return NextResponse.json({
    id: course.id, title: course.title, description: course.description,
    category: course.category, estimatedMinutes: course.estimatedMinutes,
    passingScore: course.passingScore,
    lessons: course.lessons.map(l => ({
      id: l.id, order: l.order, title: l.title, body: l.body,
      hasQuiz: !!l.quizJson,
      // We expose the quiz STRUCTURE to render, but never the correctIndex
      // (so the client can't peek at the answers).
      quiz: l.quizJson ? sanitizeQuiz(l.quizJson) : null,
      progress: enrollment?.progress.find(p => p.lessonId === l.id) ?? null,
    })),
    myEnrollment: enrollment ? {
      id: enrollment.id, startedAt: enrollment.startedAt,
      completedAt: enrollment.completedAt, score: enrollment.score,
    } : null,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const existing = await prisma.course.findFirst({
    where: { id, organizationId: u.organizationId },
    select: { id: true, title: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.course.delete({ where: { id } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "Course", entityId: id, metadata: { deleted: existing.title } });
  return NextResponse.json({ ok: true });
}

function sanitizeQuiz(s: string): any {
  try {
    const arr = JSON.parse(s) as any[];
    return arr.map(q => ({ question: q.question, choices: q.choices }));
  } catch { return null; }
}
