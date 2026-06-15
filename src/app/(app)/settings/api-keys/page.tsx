import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ApiKeysClient } from "@/components/settings/api-keys-client";
import { Key } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  // settings.api_keys — admins only by default; custom roles can grant it.
  const u = await requirePermission("settings.api_keys");
  const keys = await prisma.apiKey.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true, revokedAt: true, expiresAt: true },
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="For developers"
        icon={Key}
        title="Access codes for other tools"
        subtitle="Create special codes so other software (like Zapier or your own tools) can pull employee, shift, and payroll data. Full docs for tech teams at app.shyftforce.com/docs/api."
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
