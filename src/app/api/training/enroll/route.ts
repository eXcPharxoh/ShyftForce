// Start a course (creates an enrollment row).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const Schema = z.object({ courseId: z.string().min(1) }).strict();

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Cross-tenant: course must be in user's org
  const course = await prisma.course.findFirst({
    where: { id: parsed.data.courseId, organizationId: u.organizationId, published: true },
    select: { id: true },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const enrollment = await prisma.courseEnrollment.upsert({
    where:  { courseId_memberId: { courseId: parsed.data.courseId, memberId: u.memberId } },
    create: { courseId: parsed.data.courseId, memberId: u.memberId },
    update: {},
  });
  return NextResponse.json({ ok: true, enrollment });
}
