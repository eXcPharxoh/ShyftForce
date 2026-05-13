import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlatformHealthPage() {
  const now = new Date();
  const [latestOffer, latestSnapshot, latestRep, failedConnections, pastDueSubs, dbOk, latestErrorAudit] = await Promise.all([
    prisma.openShiftOffer.findFirst({ orderBy: { sentAt: "desc" }, select: { sentAt: true } }),
    prisma.posRevenueSnapshot.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null),
    prisma.workerProfile.findFirst({ where: { reputationUpdatedAt: { not: null } }, orderBy: { reputationUpdatedAt: "desc" }, select: { reputationUpdatedAt: true } }).catch(() => null),
    prisma.posConnection.count({ where: { status: "error" } }).catch(() => 0),
    prisma.organization.findMany({ where: { subscriptionStatus: "past_due" }, select: { id: true, name: true } }),
    prisma.$queryRaw`SELECT 1 as ok`.then(() => true).catch(() => false),
    prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const env = {
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL:    !!process.env.NEXTAUTH_URL,
    DATABASE_URL:    !!process.env.DATABASE_URL,
    SHYFTFORCE_AI_KEY: !!process.env.SHYFTFORCE_AI_KEY,
    STRIPE_SECRET_KEY:     !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY:        !!process.env.RESEND_API_KEY,
    EMAIL_FROM:            !!process.env.EMAIL_FROM,
    CRON_SECRET:           !!process.env.CRON_SECRET,
    PLATFORM_ADMIN_EMAILS: !!process.env.PLATFORM_ADMIN_EMAILS,
  };
  const envMissing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);

  const minutesSince = (d?: Date | null) => d ? Math.floor((+now - +d) / 60_000) : null;
  const cronCoverage = minutesSince(latestOffer?.sentAt);
  const cronPos      = minutesSince(latestSnapshot?.createdAt);
  const cronRep      = minutesSince(latestRep?.reputationUpdatedAt);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">System health</h1>
        <p className="text-sm text-ink-500">Real-time check of DB, env config, cron jobs, and external integrations</p>
      </header>

      <section className="card p-5">
        <h3 className="text-sm font-bold mb-3">Core services</h3>
        <ul className="space-y-2 text-sm">
          <HealthRow ok={dbOk} label="Database (Neon Postgres)" sub={dbOk ? "Responding" : "NOT responding — check DATABASE_URL"} />
          <HealthRow ok={envMissing.length === 0} label="Environment variables" sub={envMissing.length === 0 ? "All required vars set" : `Missing: ${envMissing.join(", ")}`} />
          <HealthRow ok={latestErrorAudit !== null} label="App is recording activity" sub={latestErrorAudit ? `Last audit ${minutesSince(latestErrorAudit.createdAt)} min ago` : "No audit events yet"} />
        </ul>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-bold mb-3">Cron jobs (vercel.json)</h3>
        <ul className="space-y-2 text-sm">
          <CronRow expectedMaxMinutes={10}  label="Coverage autopilot (*/2 min)"   minutesAgo={cronCoverage} />
          <CronRow expectedMaxMinutes={30}  label="POS sync (*/15 min)"            minutesAgo={cronPos} />
          <CronRow expectedMaxMinutes={420} label="Reputation rebuild (every 6h)"  minutesAgo={cronRep} />
        </ul>
        <p className="text-[11px] text-ink-500 mt-3">Cron health is inferred from the latest record each job writes. Recent run + no activity = job working, just nothing new to do.</p>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-bold mb-3">Integrations</h3>
        <ul className="space-y-2 text-sm">
          <HealthRow ok={failedConnections === 0} label="POS connections" sub={failedConnections === 0 ? "All POS connections healthy" : `${failedConnections} POS connection(s) errored`} />
          <HealthRow ok={pastDueSubs.length === 0} label="Stripe subscriptions" sub={pastDueSubs.length === 0 ? "No past-due subscriptions" : `${pastDueSubs.length} past due:`} />
        </ul>
        {pastDueSubs.length > 0 && (
          <ul className="mt-2 ml-7 text-[11px] space-y-0.5">
            {pastDueSubs.map((o) => (
              <li key={o.id}><Link href={`/platform/orgs/${o.id}`} className="text-rose-600 underline hover:no-underline">{o.name}</Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-bold mb-3">Required env vars</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {Object.entries(env).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              {v ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />}
              <span className="font-mono">{k}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HealthRow({ ok, label, sub }: { ok: boolean; label: string; sub?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{label}</div>
        {sub && <div className={`text-[11px] ${ok ? "text-ink-500" : "text-rose-700"}`}>{sub}</div>}
      </div>
    </li>
  );
}

function CronRow({ label, minutesAgo, expectedMaxMinutes }: { label: string; minutesAgo: number | null; expectedMaxMinutes: number }) {
  const stale = minutesAgo === null || minutesAgo > expectedMaxMinutes * 2;
  return (
    <li className="flex items-start gap-2.5">
      {stale
        ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className={`text-[11px] ${stale ? "text-amber-700" : "text-ink-500"}`}>
          {minutesAgo === null ? "Never observed activity" : `Last activity ${minutesAgo} min ago${stale ? " — may indicate cron stopped" : ""}`}
        </div>
      </div>
    </li>
  );
}
