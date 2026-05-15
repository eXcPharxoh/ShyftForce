// Training & LMS — courses + lessons + quizzes.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const QuizQuestionSchema = z.object({
  question:      z.string().min(2).max(500),
  choices:       z.array(z.string().min(1).max(200)).min(2).max(8),
  correctIndex:  z.number().int().min(0),
}).strict();

const LessonSchema = z.object({
  title:    z.string().min(2).max(200),
  body:     z.string().min(2).max(20_000),
  quiz:     z.array(QuizQuestionSchema).optional().nullable(),
}).strict();

const CreateSchema = z.object({
  title:            z.string().min(2).max(200),
  description:      z.string().max(2000).optional().nullable(),
  category:         z.enum(["onboarding", "safety", "compliance", "skills", "other"]).default("other"),
  estimatedMinutes: z.number().int().min(1).max(600).default(15),
  passingScore:     z.number().int().min(0).max(100).default(80),
  lessons:          z.array(LessonSchema).min(1).max(50),
}).strict();

export async function GET() {
  const u = await requireUser();
  const items = await prisma.course.findMany({
    where: { organizationId: u.organizationId, published: true },
    include: {
      _count: { select: { lessons: true } },
      enrollments: { where: { memberId: u.memberId }, select: { startedAt: true, completedAt: true, score: true } },
    },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    items: items.map(c => ({
      id: c.id, title: c.title, description: c.description, category: c.category,
      estimatedMinutes: c.estimatedMinutes, lessonCount: c._count.lessons,
      myEnrollment: c.enrollments[0]
        ? {
            startedAt:   c.enrollments[0].startedAt,
            completedAt: c.enrollments[0].completedAt,
            score:       c.enrollments[0].score,
          }
        : null,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const course = await prisma.$transaction(async (tx) => {
    const c = await tx.course.create({
      data: {
        organizationId: u.organizationId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
        estimatedMinutes: parsed.data.estimatedMinutes,
        passingScore: parsed.data.passingScore,
        createdById: u.id,
      },
    });
    await tx.lesson.createMany({
      data: parsed.data.lessons.map((l, i) => ({
        courseId: c.id, order: i,
        title: l.title, body: l.body,
        quizJson: l.quiz?.length ? JSON.stringify(l.quiz) : null,
      })),
    });
    return c;
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Course", entityId: course.id,
    metadata: { title: course.title, lessonCount: parsed.data.lessons.length },
  });

  return NextResponse.json({ ok: true, course });
}
