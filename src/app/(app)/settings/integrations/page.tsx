import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { FinchConnectCard } from "@/components/integrations/finch-card";
import { Wrench, MessageSquare, Calendar, CheckCircle2 } from "lucide-react";

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;
  const [org, slack] = await Promise.all([
    prisma.organization.findUnique({ where: { id: u.organizationId } }),
    prisma.slackConnection.findUnique({
      where: { organizationId: u.organizationId },
      select: { teamName: true, installedAt: true, defaultChannel: true },
    }).catch(() => null),
  ]);
  const slackConfigured = !!process.env.SLACK_CLIENT_ID;

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Workspace"
        icon={Wrench}
        title="Integrations"
        subtitle="Connect shyftforce to your payroll, calendar, and team tools."
      />

      {sp.connected && (
        <div className="card p-4 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-sm">
          ✅ Payroll provider connected. Run a sync below to match employees.
        </div>
      )}
      {sp.error && (
        <div className="card p-4 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200 text-sm">
          Connection failed: {sp.error}
        </div>
      )}

      <FinchConnectCard
        connected={!!org?.finchAccessToken}
        provider={org?.finchProviderId}
        connectedAt={org?.finchConnectedAt?.toISOString()}
        apiConfigured={!!process.env.FINCH_CLIENT_ID}
      />

      {/* Slack — real OAuth-backed integration (chat.postMessage + channels:read).
          Surfaces a connect button when not yet linked; status badge once linked. */}
      <section className="card p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4A154B]/10 text-[#4A154B] dark:bg-[#4A154B]/20 dark:text-purple-300 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="h-section !mb-0">Slack</h3>
              {slack && <span className="badge-green inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</span>}
            </div>
            <p className="text-[13px] text-ink-500 dark:text-ink-400 mt-1">
              Post approval requests, shift offers, and incident pings into Slack channels.
            </p>
            {slack ? (
              <div className="mt-3 text-[12px] text-ink-600 dark:text-ink-300">
                Workspace: <b>{slack.teamName ?? "—"}</b>
                {slack.defaultChannel && <> · default channel: <code className="text-[11px]">{slack.defaultChannel}</code></>}
                <div className="mt-2 text-ink-500 dark:text-ink-400">Channel routing is managed via the API for now — full settings UI coming.</div>
              </div>
            ) : slackConfigured ? (
              <a href="/api/slack/connect" className="btn-primary mt-3 inline-flex">Connect Slack</a>
            ) : (
              <div className="mt-3 text-[12px] text-amber-700 dark:text-amber-300">Slack OAuth isn&apos;t configured on this server. Set <code>SLACK_CLIENT_ID</code> + <code>SLACK_CLIENT_SECRET</code> to enable.</div>
            )}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="h-section mb-3">Coming soon</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {[
            { icon: Calendar,      name: "Google Calendar", desc: "Auto-sync each member's shifts" },
            { icon: MessageSquare, name: "Microsoft Teams", desc: "Notifications for the M365 crowd" },
            { icon: Calendar,      name: "QuickBooks",      desc: "Direct accounting export" },
          ].map(i => {
            const Icon = i.icon;
            return (
              <li key={i.name} className="flex items-center gap-2.5 p-3 rounded-xl border border-ink-200 dark:border-ink-800">
                <div className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-400 flex items-center justify-center"><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">{i.name}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">{i.desc}</div>
                </div>
                <span className="badge-gray">soon</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
