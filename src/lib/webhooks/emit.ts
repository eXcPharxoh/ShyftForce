// Outbound webhook emission. Every meaningful org event funnels through here:
//   - we look up the org's active subscriptions
//   - filter by event type
//   - sign the payload with HMAC-SHA256
//   - POST it to the customer endpoint
//   - record delivery + auto-disable on consecutive failures
//
// Designed to be FIRE-AND-FORGET: callers always wrap in .catch(() => {}) so
// webhook failures never break the user-facing operation.

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type WebhookEvent =
  | "shift.created"   | "shift.updated"   | "shift.deleted"  | "shift.published"
  | "shift.claimed"   | "shift.swapped"
  | "member.invited"  | "member.joined"   | "member.deactivated"
  | "timesheet.approved"
  | "time_off.created" | "time_off.approved" | "time_off.rejected" | "time_off.updated"
  | "expense.created"  | "expense.approved"  | "expense.rejected"
  | "incident.created"
  | "billing.subscription_changed";

const MAX_FAILURES_BEFORE_DISABLE = 8;
const RESPONSE_BODY_TRUNCATE_BYTES = 1024;

export async function emitWebhook(args: {
  organizationId: string;
  event:          WebhookEvent;
  data:           Record<string, any>;
}): Promise<void> {
  const subs = await prisma.webhookSubscription.findMany({
    where: { organizationId: args.organizationId, active: true },
    select: { id: true, url: true, secret: true, events: true },
  });
  if (subs.length === 0) return;

  const matching = subs.filter(s => {
    try {
      const events = JSON.parse(s.events) as string[];
      return events.includes(args.event) || events.includes("*");
    } catch { return false; }
  });
  if (matching.length === 0) return;

  // Dispatch all in parallel — they're independent customer endpoints.
  await Promise.all(matching.map(s => deliverOne({
    subscriptionId: s.id, url: s.url, secret: s.secret,
    organizationId: args.organizationId, event: args.event, data: args.data,
  })));
}

async function deliverOne(opts: {
  subscriptionId: string;
  url:            string;
  secret:         string;
  organizationId: string;
  event:          string;
  data:           Record<string, any>;
}) {
  const payload = {
    event:          opts.event,
    organizationId: opts.organizationId,
    occurredAt:     new Date().toISOString(),
    data:           opts.data,
  };
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", opts.secret).update(body).digest("hex");

  const delivery = await prisma.webhookDelivery.create({
    data: {
      subscriptionId: opts.subscriptionId,
      organizationId: opts.organizationId,
      eventType:      opts.event,
      payload:        body,
      status:         "pending",
    },
  });

  try {
    const res = await fetch(opts.url, {
      method: "POST",
      headers: {
        "Content-Type":          "application/json",
        "User-Agent":            "ShyftForce-Webhook/1.0",
        "X-ShyftForce-Event":    opts.event,
        "X-ShyftForce-Delivery": delivery.id,
        "X-ShyftForce-Signature":`sha256=${signature}`,
      },
      body,
      // Tight timeout — webhooks must not hold our request thread hostage
      signal: AbortSignal.timeout(8000),
    });
    const respText = (await res.text().catch(() => "")).slice(0, RESPONSE_BODY_TRUNCATE_BYTES);
    const ok = res.status >= 200 && res.status < 300;
    await prisma.$transaction([
      prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status:       ok ? "delivered" : "failed",
          httpStatus:   res.status,
          responseBody: respText,
          attempts:     1,
          deliveredAt:  ok ? new Date() : null,
        },
      }),
      prisma.webhookSubscription.update({
        where: { id: opts.subscriptionId },
        data: {
          lastDeliveryAt:     new Date(),
          lastDeliveryStatus: res.status,
          consecutiveFailures: ok ? 0 : { increment: 1 },
        },
      }),
    ]);
    if (!ok) await maybeDisable(opts.subscriptionId);
  } catch (e: any) {
    await prisma.$transaction([
      prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "failed", responseBody: (e?.message ?? "fetch error").slice(0, RESPONSE_BODY_TRUNCATE_BYTES), attempts: 1 },
      }),
      prisma.webhookSubscription.update({
        where: { id: opts.subscriptionId },
        data: { lastDeliveryAt: new Date(), consecutiveFailures: { increment: 1 } },
      }),
    ]);
    await maybeDisable(opts.subscriptionId);
  }
}

async function maybeDisable(subscriptionId: string) {
  const s = await prisma.webhookSubscription.findUnique({
    where: { id: subscriptionId },
    select: { consecutiveFailures: true },
  });
  if (s && s.consecutiveFailures >= MAX_FAILURES_BEFORE_DISABLE) {
    await prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: { active: false, disabledAt: new Date() },
    });
  }
}
