// Square POS adapter. STUB: returns "needs setup" until real OAuth client is wired.
// To enable: set SQUARE_CLIENT_ID + SQUARE_CLIENT_SECRET in env, implement OAuth
// callback at /api/pos/oauth/square/callback, and replace the throw blocks below.
//
// Reference docs (read but do not call from inside the app at runtime):
//   https://developer.squareup.com/reference/square/orders-api/search-orders

import type { PosAdapter, PosCredentials, FetchSalesOptions, SalesInterval } from "./types";

const SQUARE_BASE = process.env.SQUARE_API_BASE ?? "https://connect.squareup.com";

async function req(path: string, init: RequestInit & { token: string }) {
  const r = await fetch(`${SQUARE_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${init.token}`,
      "Square-Version": "2025-04-16",
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`Square ${r.status}: ${await r.text().catch(() => "")}`);
  return r.json();
}

export const squareAdapter: PosAdapter = {
  provider: "square",
  async ping(creds: PosCredentials) {
    if (!creds.accessToken || !creds.externalId) {
      return { ok: false, error: "Square credentials not connected. Connect via Settings → POS to enable live sync." };
    }
    try {
      const r = await req(`/v2/locations/${creds.externalId}`, { method: "GET", token: creds.accessToken });
      return { ok: true, label: r?.location?.name ?? "Square location" };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
  async fetchSales(creds: PosCredentials, opts: FetchSalesOptions): Promise<SalesInterval[]> {
    if (!creds.accessToken || !creds.externalId) return [];
    // Square has no native "sales by hour" report endpoint at v2 — must aggregate orders client-side.
    const r = await req(`/v2/orders/search`, {
      method: "POST",
      token: creds.accessToken,
      body: JSON.stringify({
        location_ids: [creds.externalId],
        query: {
          filter: { date_time_filter: { closed_at: { start_at: opts.from.toISOString(), end_at: opts.to.toISOString() } } },
          sort: { sort_field: "CLOSED_AT", sort_order: "ASC" },
        },
        limit: 500,
      }),
    });
    const orders = r?.orders ?? [];
    const granMs = (opts.granularityMinutes ?? 60) * 60_000;
    const buckets = new Map<number, { gross: number; tx: number }>();
    for (const o of orders) {
      const closed = new Date(o.closed_at ?? o.created_at);
      const bucketStart = Math.floor(+closed / granMs) * granMs;
      const slot = buckets.get(bucketStart) ?? { gross: 0, tx: 0 };
      slot.gross += o.total_money?.amount ?? 0;
      slot.tx += 1;
      buckets.set(bucketStart, slot);
    }
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([start, v]) => ({
      intervalStart: new Date(start),
      intervalEnd:   new Date(start + granMs),
      grossSalesCents: v.gross,
      transactionCount: v.tx,
    }));
  },
};
