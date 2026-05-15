// CRUD for API keys. Manager/admin only. Raw key shown ONCE on create.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { createApiKey, ALL_SCOPES } from "@/lib/api-keys";

const CreateSchema = z.object({
  name:    z.string().min(2).max(80),
  scopes:  z.array(z.enum(ALL_SCOPES as any)).min(1).max(ALL_SCOPES.length),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const keys = await prisma.apiKey.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, prefix: true, scopes: true,
      createdAt: true, lastUsedAt: true, revokedAt: true, expiresAt: true,
    },
  });
  return NextResponse.json({
    items: keys.map(k => ({ ...k, scopes: safeParse(k.scopes) })),
    catalog: ALL_SCOPES,
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  const { fullKey, record } = await createApiKey({
    organizationId: u.organizationId,
    name: parsed.data.name,
    scopes: parsed.data.scopes,
    createdById: u.id,
    expiresAt: parsed.data.expiresInDays ? new Date(Date.now() + parsed.data.expiresInDays * 86400 * 1000) : undefined,
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "ApiKey", entityId: record.id,
    metadata: { name: parsed.data.name, scopes: parsed.data.scopes, prefix: record.prefix },
  });

  return NextResponse.json({
    ok: true,
    key: { id: record.id, prefix: record.prefix, name: parsed.data.name, scopes: parsed.data.scopes },
    // Shown ONCE
    fullKey,
    instructions: "Send this in the Authorization header: 'Authorization: Bearer <key>'. We can't show this value again — store it safely.",
  });
}

function safeParse(s: string): string[] { try { return JSON.parse(s); } catch { return []; } }
