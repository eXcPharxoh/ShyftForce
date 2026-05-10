import { NextResponse } from "next/server";
import { requireManagerOrAdmin } from "@/lib/session";

// Returns the Finch Connect URL the manager should be redirected to.
// After they pick a provider + auth, Finch redirects back to /api/finch/callback?code=...
export async function GET(req: Request) {
  const u = await requireManagerOrAdmin();
  if (!process.env.FINCH_CLIENT_ID) {
    return NextResponse.json({ error: "FINCH_CLIENT_ID not configured. Get one at https://dashboard.tryfinch.com/" }, { status: 500 });
  }
  const origin = (process.env.NEXTAUTH_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const redirectUri = process.env.FINCH_REDIRECT_URI ?? `${origin}/api/finch/callback`;
  const params = new URLSearchParams({
    client_id: process.env.FINCH_CLIENT_ID,
    redirect_uri: redirectUri,
    products: "company directory employment payment pay_statement",  // request the standard product set
    sandbox: process.env.FINCH_USE_SANDBOX === "true" ? "true" : "false",
    state: u.organizationId,  // bounced back to us — used to identify the org
  });
  return NextResponse.json({ url: `https://connect.tryfinch.com/authorize?${params.toString()}` });
}
