// Manage org-level custom roles. Admin-only.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { PERMISSION_CATALOG, type Permission } from "@/lib/permissions";

const CreateSchema = z.object({
  name:        z.string().min(2).max(80),
  description: z.string().max(500).optional().nullable(),
  permissions: z.array(z.enum(PERMISSION_CATALOG.map(p => p.key) as any)).min(1),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const roles = await prisma.customRole.findMany({
    where: { organizationId: u.organizationId },
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    items: roles.map(r => ({
      id: r.id, name: r.name, description: r.description,
      permissions: safeParse(r.permissions),
      memberCount: r._count.members,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    })),
    catalog: PERMISSION_CATALOG,
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  if (u.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const created = await prisma.customRole.create({
      data: {
        organizationId: u.organizationId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        permissions: JSON.stringify(parsed.data.permissions),
      },
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "org.update", entityType: "CustomRole", entityId: created.id,
      metadata: { name: parsed.data.name, permissionCount: parsed.data.permissions.length },
    });
    return NextResponse.json({ ok: true, role: { id: created.id, name: created.name } });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "A role with that name already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}

function safeParse(s: string): string[] { try { return JSON.parse(s); } catch { return []; } }
