// Toast POS adapter. STUB: returns "needs setup" until real OAuth client is wired.
// To enable: set TOAST_CLIENT_ID + TOAST_CLIENT_SECRET in env, implement the OAuth
// callback at /api/pos/oauth/toast/callback, and replace the throw blocks below.
//
// Reference docs (read but do not call from inside the app at runtime):
//   https://doc.toasttab.com/

import type { PosAdapter, PosCredentials, FetchSalesOptions, SalesInterval } from "./types";

const TOAST_BASE = process.env.TOAST_API_BASE ?? "https://ws-api.toasttab.com";

async function req(path: string, init: RequestInit & { token: string }) {
  const r = await fetch(`${TOAST_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${init.token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`Toast ${r.status}: ${await r.text().catch(() => "")}`);
  return r.json();
}

export const toastAdapter: PosAdapter = {
  provider: "toast",
  async ping(creds: PosCredentials) {
    if (!creds.accessToken || !creds.externalId) {
      return { ok: false, error: "Toast credentials not connected. Connect via Settings → POS to enable live sync." };
    }
    try {
      const r = await req(`/restaurants/v1/restaurants/${creds.externalId}`, { method: "GET", token: creds.accessToken });
      return { ok: true, label: r?.general?.name ?? "Toast restaurant" };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
  async fetchSales(creds: PosCredentials, opts: FetchSalesOptions): Promise<SalesInterval[]> {
    if (!creds.accessToken || !creds.externalId) return [];
    // /reporting/v1/reports/sales?startDate=...&endDate=...&granularity=hour
    const qs = new URLSearchParams({
      startDate: opts.from.toISOString(),
      endDate: opts.to.toISOString(),
      granularity: (opts.granularityMinutes ?? 60) >= 60 ? "hour" : "minute",
    });
    const r = await req(`/reporting/v1/restaurants/${creds.externalId}/sales?${qs}`, { method: "GET", token: creds.accessToken });
    const buckets = r?.buckets ?? [];
    return buckets.map((b: any) => ({
      intervalStart: new Date(b.start),
      intervalEnd:   new Date(b.end),
      grossSalesCents: Math.round((b.grossSales ?? 0) * 100),
      netSalesCents:   b.netSales != null ? Math.round(b.netSales * 100) : undefined,
      transactionCount: b.transactionCount ?? 0,
    }));
  },
};
