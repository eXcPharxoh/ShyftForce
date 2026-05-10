import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getAdapter, SUPPORTED_PROVIDERS } from "@/lib/pos/adapter";
import { z } from "zod";

const Schema = z.object({
  provider: z.enum(["manual", "toast", "square", "clover"]),
  locationId: z.string(),
  externalId: z.string().optional().nullable(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
});

export async function GET() {
  const u = await requireManagerOrAdmin();
  const conns = await prisma.posConnection.findMany({
    where: { organizationId: u.organizationId },
    include: { location: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    providers: SUPPORTED_PROVIDERS,
    connections: conns.map((c) => ({
      id: c.id,
      provider: c.provider,
      status: c.status,
      locationId: c.locationId,
      locationName: c.location?.name ?? null,
      externalId: c.externalId,
      lastSyncAt: c.lastSyncAt,
      syncError: c.syncError,
      createdAt: c.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Verify location is in org
  const loc = await prisma.location.findFirst({ where: { id: parsed.data.locationId, organizationId: u.organizationId } });
  if (!loc) return NextResponse.json({ error: "location not in org" }, { status: 404 });

  // Optional: ping the adapter to verify creds before saving
  const adapter = getAdapter(parsed.data.provider);
  let pingResult: { ok: boolean; label?: string; error?: string } = { ok: true };
  if (parsed.data.provider !== "manual") {
    pingResult = await adapter.ping({
      accessToken: parsed.data.accessToken ?? null,
      refreshToken: parsed.data.refreshToken ?? null,
      externalId: parsed.data.externalId ?? null,
    });
  }

  const created = await prisma.posConnection.create({
    data: {
      organizationId: u.organizationId,
      locationId: parsed.data.locationId,
      provider: parsed.data.provider,
      accessToken: parsed.data.accessToken ?? null,
      refreshToken: parsed.data.refreshToken ?? null,
      externalId: parsed.data.externalId ?? null,
      status: pingResult.ok ? "connected" : "error",
      syncError: pingResult.error ?? null,
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "pos.connect", entityType: "PosConnection", entityId: created.id,
    metadata: { provider: parsed.data.provider, locationId: parsed.data.locationId, ping: pingResult },
  });

  return NextResponse.json({ ok: true, connection: created, ping: pingResult });
}
