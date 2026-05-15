import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { exchangeCode } from "@/lib/slack";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return NextResponse.redirect(new URL("/settings/integrations?slack=error&reason=no_code", req.url));

  const c = await cookies();
  const stateCookie = c.get("slack_oauth_state")?.value;
  c.delete("slack_oauth_state");
  if (!stateCookie) return NextResponse.redirect(new URL("/settings/integrations?slack=error&reason=expired", req.url));

  let parsed: { state: string; orgId: string; userId: string };
  try { parsed = JSON.parse(stateCookie); } catch {
    return NextResponse.redirect(new URL("/settings/integrations?slack=error&reason=bad_state", req.url));
  }
  if (parsed.state !== state) return NextResponse.redirect(new URL("/settings/integrations?slack=error&reason=state_mismatch", req.url));

  const ex = await exchangeCode({ code });
  if (!ex.ok || !ex.accessToken) {
    return NextResponse.redirect(new URL(`/settings/integrations?slack=error&reason=${encodeURIComponent(ex.error ?? "exchange_failed")}`, req.url));
  }

  await prisma.slackConnection.upsert({
    where: { organizationId: parsed.orgId },
    update: {
      teamId: ex.teamId!, teamName: ex.teamName ?? "Slack workspace",
      accessToken: ex.accessToken, installedById: parsed.userId,
      installedAt: new Date(),
    },
    create: {
      organizationId: parsed.orgId,
      teamId: ex.teamId!, teamName: ex.teamName ?? "Slack workspace",
      accessToken: ex.accessToken, installedById: parsed.userId,
    },
  });

  await audit({
    organizationId: parsed.orgId, actorId: parsed.userId,
    action: "org.update", entityType: "SlackConnection",
    metadata: { connected: ex.teamName, teamId: ex.teamId },
  });

  return NextResponse.redirect(new URL("/settings/integrations?slack=connected", req.url));
}
