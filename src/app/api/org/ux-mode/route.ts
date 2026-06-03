// Owner-only PATCH for the per-workspace UX mode toggle.
//   "simple" = friendly mode for small businesses. Hides advanced features.
//   "pro"    = full app (the current behavior — default for existing orgs).
// GET returns the current value so the toggle UI can show it.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({
  uxMode: z.enum(["simple", "pro"]),
}).strict();

export async function GET() {
  const u = await requireUser();
  const org = await prisma.organization.findUnique({
    where: { id: u.organizationId },
    select: { uxMode: true },
  });
  return NextResponse.json({ uxMode: org?.uxMode ?? "pro" });
}

export async function PATCH(req: Request) {
  const u = await requireUser();
  if (u.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an owner can change this." }, { status: 403 });
  }
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.organization.update({
    where: { id: u.organizationId },
    data: { uxMode: parsed.data.uxMode },
  });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "Organization", entityId: u.organizationId,
    metadata: { uxMode: parsed.data.uxMode },
  });
  return NextResponse.json({ ok: true });
}
