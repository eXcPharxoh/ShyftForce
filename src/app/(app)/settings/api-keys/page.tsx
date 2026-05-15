import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ApiKeysClient } from "@/components/settings/api-keys-client";
import { Key } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const u = await requireManagerOrAdmin();
  const keys = await prisma.apiKey.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true, revokedAt: true, expiresAt: true },
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Developer"
        icon={Key}
        title="API keys"
        subtitle="Issue scoped keys for the public REST API (v1). All endpoints documented at app.shyftforce.com/docs/api."
      />
      <ApiKeysClient
        initial={keys.map(k => ({
          ...k,
          scopes: safeParse(k.scopes),
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          revokedAt:  k.revokedAt?.toISOString() ?? null,
          expiresAt:  k.expiresAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}

function safeParse(s: string): string[] { try { return JSON.parse(s); } catch { return []; } }
