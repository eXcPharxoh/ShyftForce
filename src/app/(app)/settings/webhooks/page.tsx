import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { WebhooksClient } from "@/components/settings/webhooks-client";
import { Webhook } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const u = await requireManagerOrAdmin();
  const subs = await prisma.webhookSubscription.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { createdAt: "desc" },
  });

  const initial = subs.map(s => ({
    id: s.id, url: s.url, description: s.description,
    events: safeParse(s.events),
    active: s.active, createdAt: s.createdAt.toISOString(),
    lastDeliveryAt:     s.lastDeliveryAt?.toISOString() ?? null,
    lastDeliveryStatus: s.lastDeliveryStatus,
    consecutiveFailures: s.consecutiveFailures,
    disabledAt:         s.disabledAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Developer"
        icon={Webhook}
        title="Outbound webhooks"
        subtitle="Get real-time events POSTed to your own endpoints. Every payload is HMAC-SHA256-signed."
      />
      <WebhooksClient initial={initial} />
    </div>
  );
}

function safeParse(s: string): string[] { try { return JSON.parse(s); } catch { return []; } }
