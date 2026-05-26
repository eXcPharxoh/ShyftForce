// Org-owner control for the clock-in face-verification policy.
//   off   = disabled  |  flag = compare + record mismatch  |  block = reject mismatch
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({ mode: z.enum(["off", "flag", "block"]) }).strict();

export async function PATCH(req: Request) {
  const u = await requireUser();
  if (u.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an owner can change this." }, { status: 403 });
  }
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }
  await prisma.organization.update({
    where: { id: u.organizationId },
    data: { faceVerification: parsed.data.mode },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Organization", entityId: u.organizationId,
    metadata: { faceVerification: parsed.data.mode },
  });
  return NextResponse.json({ ok: true, mode: parsed.data.mode });
}
