import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SUPPORTED_PROVIDERS } from "@/lib/pos/adapter";
import { PageHeader } from "@/components/ui/page-header";
import { ConnectForm } from "@/components/pos/connect-form";
import { ManualRevenueForm } from "@/components/pos/manual-revenue-form";
import { SyncButton } from "@/components/pos/sync-button";
import { DisconnectButton } from "@/components/pos/disconnect-button";
import { Plug, Receipt, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PosSettingsPage() {
  const u = await requireManagerOrAdmin();

  const [connections, locations] = await Promise.all([
    prisma.posConnection.findMany({
      where: { organizationId: u.organizationId },
      include: { location: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Live revenue"
        icon={Plug}
        title="POS connections"
        subtitle="Pull live sales for live labor% tracking and send-home recommendations."
      >
        <SyncButton />
        {/* Hide stub providers (Toast/Square/Clover) from the UI until
            their adapters land a real OAuth + sync. The API still
            accepts them so we can quietly test them per-org, but a
            paying customer shouldn't see a half-built option they'll
            try and bounce off. Manual entry is always available. */}
        <ConnectForm
          providers={SUPPORTED_PROVIDERS.filter(p => p.status !== "stub")}
          locations={locations.map(l => ({ id: l.id, name: l.name }))}
        />
      </PageHeader>

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-ink-100 dark:border-ink-800">
          <h3 className="text-sm font-semibold">Connected providers ({connections.length})</h3>
        </header>
        {connections.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500 dark:text-ink-400">
            No POS connected yet. Use <span className="font-semibold">Connect POS</span> above to add manual revenue entry — Toast, Square, and Clover integrations are launching soon.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {connections.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0"><Plug className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm capitalize">{c.provider} · {c.location?.name ?? "—"}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">
                    {c.externalId ? `ID ${c.externalId} · ` : ""}
                    {c.lastSyncAt ? `Last sync ${new Date(c.lastSyncAt).toLocaleString()}` : "Never synced"}
                  </div>
                  {c.syncError && <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" /> {c.syncError}</div>}
                </div>
                <span className={c.status === "connected" ? "badge-green" : c.status === "error" ? "badge-red" : "badge-gray"}>
                  {c.status === "connected" && <CheckCircle2 className="w-3 h-3 mr-1" />} {c.status}
                </span>
                <DisconnectButton id={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Receipt className="w-4 h-4" /> Manual revenue entry</h3>
        <p className="text-[11px] text-ink-500 dark:text-ink-400 mb-3">Type in daily gross sales for any location — useful for trial accounts or POS-less businesses. Live labor% updates instantly.</p>
        <ManualRevenueForm locations={locations.map(l => ({ id: l.id, name: l.name }))} />
      </section>

      <Link href="/reports/labor-live" className="block card card-hover p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-sm">Open Live Labor view →</div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">Real-time labor% per location · send-home suggestions</div>
          </div>
          <div className="text-2xl">📊</div>
        </div>
      </Link>
    </div>
  );
}
