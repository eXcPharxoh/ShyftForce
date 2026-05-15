// Slack integration. Three flows:
//   1. Customer admin clicks "Connect Slack" → OAuth → we store SlackConnection.
//   2. Server-side `notifySlack(orgId, channel, text|blocks)` posts via chat.postMessage.
//   3. Channels configured per event-type (approvals, shift offers, incidents).
//
// We hit the Slack Web API directly (no @slack/web-api dep). Workspace
// installation is a single bot scope set: chat:write + channels:read.

import { prisma } from "@/lib/prisma";

const SLACK_API = "https://slack.com/api";

export function slackAuthorizeUrl(opts: { state: string }): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) throw new Error("SLACK_CLIENT_ID not configured");
  const redirect = process.env.SLACK_REDIRECT_URI ?? "";
  const scope = [
    "chat:write",        // post to channels we're added to
    "chat:write.public", // post to public channels without joining
    "channels:read",     // list public channels for the routing picker
    "groups:read",       // list private channels
    "team:read",         // workspace name
  ].join(",");
  const params = new URLSearchParams({
    client_id: clientId,
    scope,
    redirect_uri: redirect,
    state: opts.state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeCode(opts: { code: string }): Promise<{
  ok: boolean; teamId?: string; teamName?: string; accessToken?: string; error?: string;
}> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirect = process.env.SLACK_REDIRECT_URI ?? "";
  if (!clientId || !clientSecret) return { ok: false, error: "Slack not configured on this server" };

  const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      code: opts.code, redirect_uri: redirect,
    }),
  });
  const d = await res.json();
  if (!d.ok) return { ok: false, error: d.error ?? "exchange failed" };
  return {
    ok: true,
    teamId: d.team?.id ?? d.team_id,
    teamName: d.team?.name,
    accessToken: d.access_token,
  };
}

type Block = { type: string; [k: string]: any };

export async function notifySlack(opts: {
  organizationId: string;
  category: "approval" | "shift_offer" | "incident" | "general";
  text:     string;
  blocks?:  Block[];
}): Promise<{ ok: boolean; channel?: string; error?: string }> {
  const conn = await prisma.slackConnection.findUnique({ where: { organizationId: opts.organizationId } });
  if (!conn) return { ok: false, error: "Slack not connected" };

  // Pick channel based on category, falling back to default
  const channel =
    opts.category === "approval"    ? conn.channelForApprovals :
    opts.category === "shift_offer" ? conn.channelForShiftOffers :
    opts.category === "incident"    ? conn.channelForIncidents :
    null;
  const target = channel ?? conn.defaultChannel;
  if (!target) return { ok: false, error: "No channel configured for this category" };

  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${conn.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: target, text: opts.text, blocks: opts.blocks }),
  });
  const d = await res.json();
  if (!d.ok) return { ok: false, error: d.error ?? "Slack API error" };
  return { ok: true, channel: target };
}

export async function listSlackChannels(organizationId: string): Promise<{
  channels: { id: string; name: string; isPrivate: boolean }[];
}> {
  const conn = await prisma.slackConnection.findUnique({ where: { organizationId } });
  if (!conn) return { channels: [] };

  // Combine public + private channels
  const out: { id: string; name: string; isPrivate: boolean }[] = [];
  for (const types of ["public_channel", "private_channel"]) {
    const res = await fetch(`${SLACK_API}/conversations.list?types=${types}&limit=200&exclude_archived=true`, {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    });
    const d = await res.json();
    if (d.ok && Array.isArray(d.channels)) {
      for (const c of d.channels) out.push({ id: c.id, name: c.name, isPrivate: types === "private_channel" });
    }
  }
  return { channels: out.sort((a,b) => a.name.localeCompare(b.name)) };
}
