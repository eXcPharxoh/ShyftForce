// Manage Slack connection: list channels, set per-event routing, disconnect.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { listSlackChannels } from "@/lib/slack";
import { audit } from "@/lib/audit";

export async function GET() {
  const u = await requireManagerOrAdmin();
  const conn = await prisma.slackConnection.findUnique({
    where: { organizationId: u.organizationId },
    select: {
      teamId: true, teamName: true, installedAt: true,
      defaultChannel: true, channelForApprovals: true,
      channelForShiftOffers: true, channelForIncidents: true,
    },
  });
  if (!conn) return NextResponse.json({ connected: false });
  const { channels } = await listSlackChannels(u.organizationId);
  return NextResponse.json({ connected: true, connection: conn, channels });
}

const PatchSchema = z.object({
  defaultChannel:        z.string().nullable().optional(),
  channelForApprovals:   z.string().nullable().optional(),
  channelForShiftOffers: z.string().nullable().optional(),
  channelForIncidents:   z.string().nullable().optional(),
}).strict();

export async function PATCH(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.slackConnection.update({
    where: { organizationId: u.organizationId },
    data: parsed.data,
  });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "SlackConnection", metadata: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const u = await requireManagerOrAdmin();
  await prisma.slackConnection.deleteMany({ where: { organizationId: u.organizationId } });
  await audit({ organizationId: u.organizationId, actorId: u.id, action: "org.update", entityType: "SlackConnection", metadata: { disconnected: true } });
  return NextResponse.json({ ok: true });
}
