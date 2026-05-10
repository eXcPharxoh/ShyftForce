import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getOrCreateWorkerProfile } from "@/lib/network/profile";
import { audit } from "@/lib/audit";
import { z } from "zod";

const PatchSchema = z.object({
  legalFirstName: z.string().nullable().optional(),
  legalLastName: z.string().nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  stateRegion: z.string().max(60).nullable().optional(),
  skills: z.array(z.string()).max(20).optional(), // serialized to JSON string
  discoverable: z.boolean().optional(),
});

export async function GET() {
  const u = await requireUser();
  const p = await getOrCreateWorkerProfile(u.id);
  return NextResponse.json({
    profile: {
      ...p,
      skills: p.skills ? safeJsonParse(p.skills) : [],
    },
  });
}

export async function PATCH(req: Request) {
  const u = await requireUser();
  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const profile = await getOrCreateWorkerProfile(u.id);
  const data: any = { ...parsed.data };
  if (parsed.data.skills) data.skills = JSON.stringify(parsed.data.skills);

  const updated = await prisma.workerProfile.update({ where: { id: profile.id }, data });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "worker_profile.update", entityType: "WorkerProfile", entityId: updated.id,
    metadata: { discoverable: updated.discoverable },
  });
  return NextResponse.json({ profile: { ...updated, skills: updated.skills ? safeJsonParse(updated.skills) : [] } });
}

function safeJsonParse(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
