import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, startOfWeek } from "@/lib/utils";
import { checkCompliance, RULE_META, type Violation } from "@/lib/compliance/engine";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";
import { JURISDICTIONS } from "@/lib/compliance/jurisdictions";
import { unresolvedPredictabilityForOrg } from "@/lib/compliance/predictability";
import { ShieldCheck, AlertTriangle, AlertOctagon, Sparkles, Settings as SettingsIcon, Globe } from "lucide-react";
import { ComplianceSettingsButton } from "@/components/compliance/settings-button";
import { JurisdictionPicker } from "@/components/compliance/jurisdiction-picker";
import { PredictabilityLedger } from "@/components/compliance/predictability-ledger";
import { PageHeader } from "@/components/ui/page-header";
import { AskAiHint } from "@/components/ui/ask-ai-hint";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const u = await requireUser();
  const orgId = u.organizationId;
  const start = addDays(startOfWeek(new Date()), -7);
  const end   = addDays(startOfWeek(new Date()), 21);

  const [shifts, members, settings, locations, predictability] = await Promise.all([
    prisma.shift.findMany({
      where: { location: { organizationId: orgId }, startsAt: { gte: start, lt: end }, memberId: { not: null } },
      include: { location: true, member: { include: { user: true } } },
    }),
    prisma.member.findMany({ where: { organizationId: orgId }, include: { user: true } }),
    getOrCreateComplianceSettings(orgId),
    prisma.location.findMany({ where: { organizationId: orgId } }),
    unresolvedPredictabilityForOrg(orgId),
  ]);

  const violations = checkCompliance({
    shifts: shifts.map(s => ({ id: s.id, memberId: s.memberId, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status, createdAt: s.createdAt })),
    members: members.map(m => ({ id: m.id, name: m.user.name, birthday: m.birthday })),
    settings,
  });

  const errors   = violations.filter(v => v.severity === "error");
  const warnings = violations.filter(v => v.severity === "warning");
  const byRule = new Map<string, Violation[]>();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule)!.push(v);
  }

  const affectedIds = new Set(violations.map(v => v.memberId));
  const isClean = violations.length === 0;

  const jurisdictionOptions = Object.values(JURISDICTIONS).map((j) => ({
    id: j.id, label: j.label, region: j.region,
    predictiveSchedulingDays: j.predictiveSchedulingDays,
    hasPredictabilityPay: !!j.predictabilityPay,
    mealBreakAfterHours: j.mealBreakAfterHours,
    restBreakAfterHours: j.restBreakAfterHours,
    minRestGapHours: j.minRestGapHours,
    notes: j.notes,
  }));
  const currentJurisdiction = JURISDICTIONS[settings.jurisdiction ?? "default"] ?? JURISDICTIONS.default;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Labor compliance"
        icon={ShieldCheck}
        title="Compliance Autopilot"
        subtitle={`${currentJurisdiction.label} · ${dateLabel(start)} → ${dateLabel(addDays(end, -1))} · ${shifts.length} shifts checked`}
      >
        <JurisdictionPicker current={settings.jurisdiction ?? "default"} options={jurisdictionOptions} />
        <ComplianceSettingsButton settings={settings} />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat
          tone={isClean ? "emerald" : errors.length > 0 ? "rose" : "amber"}
          icon={<ShieldCheck className="w-5 h-5" />}
          label="Status"
          value={isClean ? "All clear" : "Action needed"}
        />
        <Stat tone="rose"   icon={<AlertOctagon className="w-5 h-5" />} label="Errors"   value={errors.length} />
        <Stat tone="amber"  icon={<AlertTriangle className="w-5 h-5" />} label="Warnings" value={warnings.length} />
        <Stat tone="ink"    icon={<Sparkles className="w-5 h-5" />} label="Affected members" value={affectedIds.size} />
      </div>

      {settings.predictabilityPayEnabled && (
        <PredictabilityLedger
          events={predictability.events.map((e) => ({
            id: e.id,
            memberName: e.member.user.name,
            locationName: e.shift.location.name,
            changeType: e.changeType,
            occurredAt: e.occurredAt.toISOString(),
            shiftStartsAt: e.shiftStartsAt.toISOString(),
            noticeHours: e.noticeHours,
            hoursOwed: e.hoursOwed,
            hourlyRate: e.hourlyRate,
            amountOwedCents: e.amountOwedCents,
            reason: e.reason,
          }))}
          totalOwedCents={predictability.totalOwedCents}
          byMember={predictability.byMember}
        />
      )}

      {isClean ? (
        <section className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg">No violations detected ✨</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">All scheduled shifts comply with your active rules under {currentJurisdiction.label}.</p>
        </section>
      ) : (
        <div className="space-y-3">
          {[...byRule.entries()].map(([rule, vs]) => {
            const meta = RULE_META[rule] ?? { label: rule, emoji: "•" };
            const severityClass = vs[0].severity === "error" ? "border-rose-200 bg-rose-50/40" : "border-amber-200 bg-amber-50/30";
            return (
              <section key={rule} className={`card border ${severityClass}`}>
                <header className="px-4 py-2.5 flex items-center justify-between border-b border-ink-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.emoji}</span>
                    <h3 className="font-semibold text-sm">{meta.label}</h3>
                    <span className={vs[0].severity === "error" ? "badge bg-rose-100 text-rose-700" : "badge bg-amber-100 text-amber-700"}>
                      {vs.length} {vs[0].severity === "error" ? "error" : "warning"}{vs.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </header>
                <ul className="divide-y divide-ink-100">
                  {vs.map((v, i) => (
                    <li key={i} className="px-4 py-2.5 text-sm">
                      <div className="flex items-start gap-2">
                        {v.severity === "error"
                          ? <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div>{v.message}</div>
                          {v.recommendation && <div className="text-[11px] text-ink-500 mt-0.5">→ {v.recommendation}</div>}
                          <div className="text-[10px] text-ink-400 mt-0.5">Affects {v.shiftIds.length} shift{v.shiftIds.length === 1 ? "" : "s"}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <section className="card p-4">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h3 className="text-sm font-semibold flex items-center gap-1.5"><SettingsIcon className="w-4 h-4" /> Active rules</h3>
          <AskAiHint
            prompt="Help me understand my compliance rules. Explain what each one means in plain English and tell me which ones I should turn on for my business."
            label="Explain these in plain English"
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <RuleSetting label="Jurisdiction"                value={currentJurisdiction.label} severity="block" />
          <RuleSetting label="Max weekly hours"            value={`${settings.maxWeeklyHours}h`} severity="block" />
          <RuleSetting label="Max daily hours"             value={`${settings.maxDailyHours}h`} severity="block" />
          <RuleSetting label="Min rest gap"                value={`${settings.minRestGapHours}h`} severity="warn" />
          <RuleSetting label="Meal break required after"   value={`${settings.mealBreakRequiredAfterHours}h`} severity="block" />
          <RuleSetting label="Rest break required every"   value={settings.restBreakRequiredAfterHours > 0 ? `${settings.restBreakRequiredAfterHours}h` : "off"} severity="warn" />
          <RuleSetting label="Max consecutive days"        value={settings.maxConsecutiveDays} severity="warn" />
          <RuleSetting label="Advance notice required" value={settings.predictiveSchedulingDays > 0 ? `≥${settings.predictiveSchedulingDays}d ahead` : "off"} severity={settings.predictiveSchedulingDays > 0 ? "block" : "off"} />
          <RuleSetting label="Late-change penalty pay" value={settings.predictabilityPayEnabled ? "on" : "off"} severity={settings.predictabilityPayEnabled ? "warn" : "off"} />
          <RuleSetting label="Minor age threshold"         value={`under ${settings.minorAgeThreshold}`} severity="block" />
          <RuleSetting label="Minor max daily / weekly"    value={`${settings.minorMaxDailyHours}h / ${settings.minorMaxWeeklyHours}h`} severity="block" />
          <RuleSetting label="Minor work hours window"     value={`${settings.minorEarliestStartHour}:00–${settings.minorLatestEndHour}:00`} severity="block" />
        </div>
      </section>

      <IntegrationsGrid orgId={orgId} />
    </div>
  );
}

/* Connected services grid — design spec calls for 8 cards showing integration
   status. Some are ON if the org has wired credentials, others are AVAILABLE. */
async function IntegrationsGrid({ orgId }: { orgId: string }) {
  const [org, posCount, slackCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        finchAccessToken: true, finchProviderId: true,
        stripeCustomerId: true, stripeSubscriptionId: true,
        twilioAccountSid: true,
      },
    }),
    prisma.posConnection.count({ where: { organizationId: orgId } }),
    prisma.slackConnection.count({ where: { organizationId: orgId } }),
  ]);

  const integrations = [
    { key: "toast",   name: "Toast POS",          status: posCount > 0 ? "on" : "available", desc: "Restaurant POS sales import" },
    { key: "square",  name: "Square",             status: posCount > 0 ? "on" : "available", desc: "Retail POS + payments" },
    { key: "clover",  name: "Clover",             status: "available", desc: "POS + payment processing" },
    { key: "finch",   name: "Finch · Payroll",    status: org?.finchAccessToken ? "on" : "available", desc: org?.finchProviderId ?? "ADP / Gusto / Paychex" },
    { key: "stripe",  name: "Stripe",             status: org?.stripeCustomerId ? "on" : "available", desc: "Billing + invoicing" },
    { key: "twilio",  name: "Twilio SMS",         status: org?.twilioAccountSid ? "on" : "available", desc: "Send shift offer texts" },
    { key: "slack",   name: "Slack",              status: slackCount > 0 ? "on" : "available", desc: "Channel + DM notifications" },
    { key: "google",  name: "Google Workspace",   status: "available", desc: "SSO + calendar feed" },
    { key: "webhook", name: "Webhooks",           status: "on", desc: "HMAC-signed event delivery" },
  ];

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-semibold flex items-center gap-1.5"><Globe className="w-4 h-4" /> Connected services</h3>
          <p className="text-[11px] text-ink-500 mt-0.5 font-mono uppercase tracking-[0.12em]">Compliance-relevant integrations</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {integrations.map(i => (
          <div key={i.key} className="card p-3 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
              i.status === "on" ? "bg-success/15 text-success" : "bg-white/[0.04] text-ink-300"
            }`}>
              {i.status === "on" ? "✓" : "·"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-ink-50 truncate">{i.name}</div>
              <div className="text-[10.5px] text-ink-500 truncate">{i.desc}</div>
              <span className={`status status-${i.status === "on" ? "success" : "mute"} mt-2`}>
                {i.status === "on" ? "Connected" : "Available"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ icon, label, value, tone = "ink" }: { icon: React.ReactNode; label: string; value: string | number; tone?: "ink" | "rose" | "amber" | "emerald" }) {
  const iconCls: any = {
    ink:     "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300",
    rose:    "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    amber:   "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  };
  const valCls: any = {
    ink:     "text-ink-900 dark:text-ink-50",
    rose:    "text-rose-700 dark:text-rose-300",
    amber:   "text-amber-800 dark:text-amber-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconCls[tone]}`}>{icon}</div>
      <div>
        <div className="text-[11px] uppercase text-ink-500 font-semibold tracking-wider">{label}</div>
        <div className={`text-xl font-bold tracking-tight-2 ${valCls[tone]}`}>{value}</div>
      </div>
    </div>
  );
}

function RuleSetting({ label, value, severity = "block" }: { label: string; value: string | number; severity?: "block" | "warn" | "off" }) {
  const pillCls = severity === "block" ? "status status-danger"
                : severity === "warn"  ? "status status-warn"
                :                         "status status-mute";
  const pillLabel = severity === "block" ? "Block" : severity === "warn" ? "Warn" : "Off";
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-ink-500 text-[11px]">{label}</div>
        <div className="font-medium text-[13px] text-ink-50 mt-0.5 truncate">{value}</div>
      </div>
      <span className={pillCls} title={`Severity: ${pillLabel}`}>{pillLabel}</span>
    </div>
  );
}
