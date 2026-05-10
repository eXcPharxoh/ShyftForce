// Manual / demo POS adapter — does not call out to anything. Used when the user
// types in revenue numbers themselves or for trial onboarding before they connect a real POS.

import type { PosAdapter, PosCredentials, FetchSalesOptions, SalesInterval } from "./types";

export const manualAdapter: PosAdapter = {
  provider: "manual",
  async ping() {
    return { ok: true, label: "Manual entry" };
  },
  async fetchSales(_creds: PosCredentials, _opts: FetchSalesOptions): Promise<SalesInterval[]> {
    // Manual adapter never fetches — the snapshots are seeded by /api/pos/manual-revenue
    return [];
  },
};
