// Common types for the POS adapter layer.

export type PosProvider = "toast" | "square" | "clover" | "manual";

export type PosCredentials = {
  accessToken?: string | null;
  refreshToken?: string | null;
  externalId?: string | null;   // restaurant/location id on the POS side
};

export type SalesInterval = {
  intervalStart: Date;
  intervalEnd: Date;
  grossSalesCents: number;
  netSalesCents?: number | null;
  transactionCount?: number;
};

export type FetchSalesOptions = {
  from: Date;
  to: Date;
  granularityMinutes?: number;  // default 60
};

export interface PosAdapter {
  provider: PosProvider;
  /** Verify the credentials work and return a friendly account label. */
  ping(creds: PosCredentials): Promise<{ ok: boolean; label?: string; error?: string }>;
  /** Pull sales between [from, to] aggregated by granularity. */
  fetchSales(creds: PosCredentials, opts: FetchSalesOptions): Promise<SalesInterval[]>;
}

export type LaborSnapshot = {
  locationId: string;
  locationName: string;
  intervalStart: Date;
  intervalEnd: Date;
  laborCostCents: number;
  scheduledHours: number;
  grossSalesCents: number;
  laborPct: number | null;       // null if no revenue (avoids divide-by-zero)
  targetPct: number | null;      // org-set target for this location (location.weeklyBudget-driven heuristic)
  status: "under" | "on_target" | "over" | "no_data";
};
