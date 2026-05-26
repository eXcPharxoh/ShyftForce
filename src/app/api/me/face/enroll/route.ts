// Face enrollment for the current member (anti-buddy-punch).
// We store ONLY the 128-float descriptor computed on-device — never the photo —
// plus explicit biometric consent. DELETE clears it (right to erasure).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isValidDescriptor } from "@/lib/face/match";
import { z } from "zod";

const Schema = z.object({
  descriptor: z.array(z.number()).length(128),
  consent: z.literal(true), // must explicitly consent to biometric processing
}).strict();

export async function GET() {
  const u = await requireUser();
  const [member, org] = await Promise.all([
    prisma.member.findUnique({ where: { id: u.memberId }, select: { faceEnrolledAt: true } }),
    prisma.organization.findUnique({ where: { id: u.organizationId }, select: { faceVerification: true } }),
  ]);
  return NextResponse.json({
    enrolled: !!member?.faceEnrolledAt,
    enrolledAt: member?.faceEnrolledAt ?? null,
    mode: org?.faceVerification ?? "off",
  });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  if (!isValidDescriptor(parsed.data.descriptor)) {
    return NextResponse.json({ error: "Invalid face data — try enrolling again." }, { status: 400 });
  }
  await prisma.member.update({
    where: { id: u.memberId },
    data: {
      faceDescriptor: JSON.stringify(parsed.data.descriptor),
      faceEnrolledAt: new Date(),
      faceConsentAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const u = await requireUser();
  await prisma.member.update({
    where: { id: u.memberId },
    data: { faceDescriptor: null, faceEnrolledAt: null, faceConsentAt: null },
  });
  return NextResponse.json({ ok: true });
}
