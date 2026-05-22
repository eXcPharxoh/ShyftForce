// Customer-managed webhook subscriptions. GET lists, POST creates with a
// freshly-generated signing secret (shown ONCE in the create response).
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { assertPublicWebhookUrl } from "@/lib/webhooks/url-guard";

const WEBHOOK_EVENT_CATALOG = [
  "shift.created", "shift.updated", "shift.deleted", "shift.published",
  "shift.claimed", "shift.swapped",
  "member.invited", "member.joined", "member.deactivated",
  "timesheet.approved",
  "time_off.created", "time_off.approved", "time_off.rejected", "time_off.updated",
  "expense.created", "expense.approved", "expense.rejected",
  "incident.created",
  "billing.subscription_changed",
] as const;

const CreateSchema = z.object({
  url:         z.string().url().max(2048),
  description: z.string().max(200).optional().nullable(),
  events:      z.array(z.enum(WEBHOOK_EVENT_CATALOG)).min(1).max(WEBHOOK_EVENT_CATALOG.length),
}).strict();

export async function GET() {
  const u = await requireManagerOrAdmin();
  const items = await prisma.webhookSubscription.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, url: true, description: true, events: true,
      active: true, createdAt: true, lastDeliveryAt: true,
      lastDeliveryStatus: true, consecutiveFailures: true, disabledAt: true,
    },
  });
  return NextResponse.json({
    items: items.map(s => ({ ...s, events: safeParse(s.events) })),
    catalog: WEBHOOK_EVENT_CATALOG,
  });
}

export async function POST(req: Request) {
  const u = await requireManagerOrAdmin();
  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });

  // Reject internal / private-IP targets up front (SSRF). Re-checked at delivery.
  try {
    await assertPublicWebhookUrl(parsed.data.url);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unsafe webhook URL" }, { status: 400 });
  }

  // Generate the signing secret. Show it ONCE in the response; we store it
  // unhashed so we can sign outbound deliveries with it. (Customer is
  // expected to keep it safe; rotating creates a new subscription.)
  const secret = `whsec_${randomBytes(32).toString("base64url")}`;

  const created = await prisma.webhookSubscription.create({
    data: {
      organizationId: u.organizationId,
      url:         parsed.data.url,
      secret,
      description: parsed.data.description ?? null,
      events:      JSON.stringify(parsed.data.events),
    },
  });

  await audit({
    organizationId: u.organizationId, actorId: u.id,
    action: "org.update", entityType: "WebhookSubscription", entityId: created.id,
    metadata: { url: parsed.data.url, events: parsed.data.events },
  });

  return NextResponse.json({
    ok: true,
    subscription: {
      id: created.id, url: created.url, description: created.description,
      events: parsed.data.events, active: created.active, createdAt: created.createdAt,
    },
    // Surfaced ONCE; we don't expose it on subsequent GETs.
    secret,
    instructions: "Verify webhook signature with HMAC-SHA256 over the request body using this secret. Expected header: 'X-ShyftForce-Signature: sha256=<hex>'.",
  });
}

function safeParse(s: string): string[] {
  try { return JSON.parse(s); } catch { return []; }
}
