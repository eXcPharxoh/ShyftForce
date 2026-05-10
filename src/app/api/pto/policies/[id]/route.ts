import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireManagerOrAdmin();
  const { id } = await params;
  const data = await req.json();
  const allowed = ["name", "annualHours", "accrualMethod", "hoursPerDay", "maxBalance", "allowNegative", "active"] as const;
  const update: any = {};
  for (const k of allowed) if (k in data) update[k] = data[k];

  const existing = await prisma.ptoPolicy.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== u.organizationId) return NextResponse.json({ error: "not found" }, { status: 404 });
  const r = await prisma.ptoPolicy.update({ where: { id }, data: update });
  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "compliance.settings_update", entityType: "PtoPolicy", entityId: id, metadata: update,
  });
  return NextResponse.json(r);
}
