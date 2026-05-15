// Survey creation — was unwired. /hr/surveys had a dead "New survey" button.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  title:       z.string().min(2).max(140),
  description: z.string().max(1000).optional().nullable(),
  questions: z.array(z.object({
    question: z.string().min(2).max(500),
    type:     z.enum(["scale", "text", "yesno", "multiple_choice"]).default("scale"),
  })).min(1).max(30),
}).strict();

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const survey = await prisma.survey.create({
      data: {
        organizationId: u.organizationId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: "active",
        questions: {
          create: parsed.data.questions.map((q, i) => ({
            question: q.question,
            type:     q.type,
            order:    i,
          })),
        },
      },
      include: { questions: true },
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "org.update", entityType: "Survey", entityId: survey.id,
      metadata: { title: survey.title, questions: survey.questions.length },
    });
    return NextResponse.json({ ok: true, survey });
  } catch (e) {
    console.error("[surveys] create failed", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
