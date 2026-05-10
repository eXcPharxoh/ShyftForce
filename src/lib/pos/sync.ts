// Pulls fresh sales for every connected POS location and writes PosRevenueSnapshot
// rows. Idempotent on the (locationId, intervalStart, intervalEnd) unique key.

import { prisma } from "@/lib/prisma";
import { getAdapter } from "./adapter";
import type { PosProvider } from "./types";

export async function syncOrg(opts: { organizationId: string; lookbackHours?: number; now?: Date }) {
  const now = opts.now ?? new Date();
  const from = new Date(now.getTime() - (opts.lookbackHours ?? 6) * 3600_000);

  const conns = await prisma.posConnection.findMany({
    where: { organizationId: opts.organizationId, status: "connected", provider: { not: "manual" } },
  });

  const summary: Record<string, { synced: number; error?: string }> = {};
  for (const c of conns) {
    try {
      const adapter = getAdapter(c.provider as PosProvider);
      const intervals = await adapter.fetchSales(
        { accessToken: c.accessToken, refreshToken: c.refreshToken, externalId: c.externalId },
        { from, to: now, granularityMinutes: 60 },
      );
      let written = 0;
      for (const i of intervals) {
        if (!c.locationId) continue;
        await prisma.posRevenueSnapshot.upsert({
          where: { locationId_intervalStart_intervalEnd: { locationId: c.locationId, intervalStart: i.intervalStart, intervalEnd: i.intervalEnd } },
          create: {
            connectionId: c.id, locationId: c.locationId,
            intervalStart: i.intervalStart, intervalEnd: i.intervalEnd,
            grossSalesCents: i.grossSalesCents, netSalesCents: i.netSalesCents ?? null,
            transactionCount: i.transactionCount ?? 0, source: "api",
          },
          update: {
            grossSalesCents: i.grossSalesCents, netSalesCents: i.netSalesCents ?? null,
            transactionCount: i.transactionCount ?? 0, source: "api",
          },
        });
        written++;
      }
      await prisma.posConnection.update({ where: { id: c.id }, data: { lastSyncAt: now, syncError: null } });
      summary[c.id] = { synced: written };
    } catch (e: any) {
      await prisma.posConnection.update({ where: { id: c.id }, data: { syncError: e.message ?? String(e), status: "error" } });
      summary[c.id] = { synced: 0, error: e.message ?? String(e) };
    }
  }

  return { connections: conns.length, summary };
}
