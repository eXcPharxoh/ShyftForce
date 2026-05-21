// Clover POS adapter — OAuth stub matching the PosAdapter interface.
//
// Status: stub. Set the following env vars to enable the live OAuth flow:
//   - CLOVER_APP_ID
//   - CLOVER_APP_SECRET
//   - CLOVER_OAUTH_REDIRECT_URI  (must match the value registered in Clover's dev portal)
//
// OAuth flow: https://docs.clover.com/docs/oauth-flow
//   1. Redirect merchant to https://www.clover.com/oauth/authorize?client_id=...&redirect_uri=...
//   2. Clover redirects back with ?code=... and ?merchant_id=...
//   3. POST https://api.clover.com/oauth/token to exchange code → access_token
//   4. Persist {merchant_id, access_token, refresh_token, expires_at} on PosConnection
//
// Sales pull would use /v3/merchants/{mid}/orders?filter=createdTime>=... .
// Webhooks (ORDER_CREATED / PAYMENT_PROCESSED) can stream sales in real time.

import type { FetchSalesOptions, PosAdapter, PosCredentials, SalesInterval } from "./types";

const IS_LIVE =
  !!process.env.CLOVER_APP_ID &&
  !!process.env.CLOVER_APP_SECRET &&
  !!process.env.CLOVER_OAUTH_REDIRECT_URI;

export const CLOVER_AUTHORIZE_URL = "https://www.clover.com/oauth/authorize";
export const CLOVER_TOKEN_URL     = "https://api.clover.com/oauth/token";

export const cloverAdapter: PosAdapter = {
  provider: "clover",

  async ping(creds: PosCredentials): Promise<{ ok: boolean; label?: string; error?: string }> {
    if (!IS_LIVE) return { ok: false, error: "Clover adapter is not configured (CLOVER_APP_ID / SECRET / REDIRECT_URI missing)." };
    if (!creds.accessToken || !creds.externalId) return { ok: false, error: "Missing access token / merchant id" };
    // Real impl: GET https://api.clover.com/v3/merchants/{mId} → returns name/owner
    return { ok: false, error: "Clover live ping not implemented yet — stub adapter." };
  },

  async fetchSales(_creds: PosCredentials, _opts: FetchSalesOptions): Promise<SalesInterval[]> {
    // Returns empty array in stub mode so callers don't crash. Real
    // implementation would page through /v3/merchants/{mId}/orders and
    // bucket by granularity.
    if (!IS_LIVE) return [];
    return [];
  },
};

/** Build the URL to send the merchant to for the OAuth handshake.
 *  Returns null if Clover isn't configured. */
export function cloverAuthorizeUrl(state: string): string | null {
  if (!IS_LIVE) return null;
  const params = new URLSearchParams({
    client_id: process.env.CLOVER_APP_ID!,
    redirect_uri: process.env.CLOVER_OAUTH_REDIRECT_URI!,
    response_type: "code",
    state, // include orgSlug or signed token so the callback knows which org
  });
  return `${CLOVER_AUTHORIZE_URL}?${params.toString()}`;
}

/** Exchange authorization code for tokens. Called from /api/pos/oauth/clover/callback. */
export async function cloverExchangeCode(code: string): Promise<{ accessToken: string; merchantId: string } | { error: string }> {
  if (!IS_LIVE) return { error: "Clover OAuth is not configured." };
  const res = await fetch(CLOVER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.CLOVER_APP_ID!,
      client_secret: process.env.CLOVER_APP_SECRET!,
      code,
    }),
  });
  if (!res.ok) return { error: `Clover token exchange failed: ${res.status}` };
  const json = await res.json() as { access_token?: string; merchant_id?: string };
  if (!json.access_token || !json.merchant_id) return { error: "Clover token response missing fields" };
  return { accessToken: json.access_token, merchantId: json.merchant_id };
}
