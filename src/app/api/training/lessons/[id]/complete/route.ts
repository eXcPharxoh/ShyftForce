// Mark a lesson complete + optionally submit quiz answers. Server holds
// the correct answers so the client can't fake passing.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const Schema = z.object({
  // Indices of selected choice per question, in the same order as the quiz array.
  answers: z.array(z.number().int().min(0).max(20)).optional(),
}).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Look up the lesson + verify it's in user's org via the course
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { course: { select: { id: true, organizationId: true, passingScore: true } } },
  });
  if (!lesson || lesson.course.organizationId !== u.organizationId) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Make sure enrollment exists
  const enrollment = await prisma.courseEnrollment.upsert({
    where:  { courseId_memberId: { courseId: lesson.course.id, memberId: u.memberId } },
    create: { courseId: lesson.course.id, memberId: u.memberId },
    update: {},
    select: { id: true },
  });

  // Score the quiz if present
  let score: number | null = null;
  if (lesson.quizJson) {
    let quiz: { correctIndex: number }[] = [];
    try { quiz = JSON.parse(lesson.quizJson); } catch {}
    const answers = parsed.data.answers ?? [];
    if (answers.length !== quiz.length) {
      return NextResponse.json({ error: `This lesson has ${quiz.length} questions but you submitted ${answers.length} answers.` }, { status: 400 });
    }
    const correct = quiz.reduce((acc, q, i) => acc + (q.correctIndex === answers[i] ? 1 : 0), 0);
    score = Math.round((correct / quiz.length) * 100);
  }

  // Record progress
  const progress = await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: id } },
    create: {
      enrollmentId: enrollment.id, lessonId: id,
      completedAt: !lesson.quizJson || (score ?? 0) >= lesson.course.passingScore ? new Date() : null,
      lastScore: score,
      attempts: 1,
    },
    update: {
      lastScore: score,
      attempts: { increment: 1 },
      completedAt: !lesson.quizJson || (score ?? 0) >= lesson.course.passingScore ? new Date() : null,
    },
  });

  // Check if all lessons in the course are now complete → mark course complete + average score
  const allLessons = await prisma.lesson.findMany({ where: { courseId: lesson.course.id }, select: { id: true } });
  const allProgress = await prisma.lessonProgress.findMany({
    where: { enrollmentId: enrollment.id }, select: { lessonId: true, completedAt: true, lastScore: true },
  });
  const completedCount = allProgress.filter(p => p.completedAt).length;
  if (completedCount >= allLessons.length) {
    const scored = allProgress.filter(p => p.lastScore != null);
    const avg = scored.length ? Math.round(scored.reduce((a, p) => a + (p.lastScore ?? 0), 0) / scored.length) : null;
    await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { completedAt: new Date(), score: avg },
    });
  }

  return NextResponse.json({
    ok: true,
    passed: !lesson.quizJson || (score ?? 0) >= lesson.course.passingScore,
    score,
    courseComplete: completedCount >= allLessons.length,
  });
}
