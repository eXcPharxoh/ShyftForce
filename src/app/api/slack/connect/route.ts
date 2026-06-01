// Slack OAuth: kick off the install flow. /slack/connect → Slack authorize →
// Slack redirects back to /api/slack/callback?code=...
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { requireManagerOrAdmin } from "@/lib/session";
import { slackAuthorizeUrl } from "@/lib/slack";

export async function GET() {
  const u = await requireManagerOrAdmin();
  const state = randomBytes(16).toString("hex");
  // Stash org context in a short-lived cookie so the callback can verify state
  const c = await cookies();
  c.set("slack_oauth_state", JSON.stringify({ state, orgId: u.organizationId, userId: u.id }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 600, path: "/",
  });
  try {
    return NextResponse.redirect(slackAuthorizeUrl({ state }));
  } catch (e: any) {
    // slackAuthorizeUrl throws when SLACK_CLIENT_ID isn't set — that's a config
    // gap, not a crash. 503 keeps it out of error-rate alerts and gives the UI
    // a clear signal to render "not configured" instead of "Failed".
    return NextResponse.json({ error: e?.message ?? "Slack OAuth not configured on this workspace" }, { status: 503 });
  }
}
