import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays, dateLabel, startOfWeek } from "@/lib/utils";
import { checkCompliance, RULE_META, type Violation } from "@/lib/compliance/engine";
import { getOrCreateComplianceSettings } from "@/lib/compliance/settings";
import { ShieldCheck, AlertTriangle, AlertOctagon, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { ComplianceSettingsButton } from "@/components/compliance/settings-button";

export default async function CompliancePage() {
  const u = await requireUser();
  const orgId = u.organizationId;
  const start = addDays(startOfWeek(new Date()), -7);
  const end   = addDays(startOfWeek(new Date()), 21);

  const [shifts, members, settings, locations] = await Promise.all([
    prisma.shift.findMany({
      where: { location: { organizationId: orgId }, startsAt: { gte: start, lt: end }, memberId: { not: null } },
      include: { location: true, member: { include: { user: true } } },
    }),
    prisma.member.findMany({ where: { organizationId: orgId }, include: { user: true } }),
    getOrCreateComplianceSettings(orgId),
    prisma.location.findMany({ where: { organizationId: orgId } }),
  ]);

  const violations = checkCompliance({
    shifts: shifts.map(s => ({ id: s.id, memberId: s.memberId, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status, createdAt: s.createdAt })),
    members: members.map(m => ({ id: m.id, name: m.user.name })),
    settings,
  });

  const errors   = violations.filter(v => v.severity === "error");
  const warnings = violations.filter(v => v.severity === "warning");
  const byRule = new Map<string, Violation[]>();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule)!.push(v);
  }

  // affected members
  const affectedIds = new Set(violations.map(v => v.memberId));
  const isClean = violations.length === 0;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-500" /> Compliance Autopilot
          </h1>
          <p className="text-sm text-ink-500">{dateLabel(start)} → {dateLabel(addDays(end, -1))} · {shifts.length} shifts checked</p>
        </div>
        <ComplianceSettingsButton settings={settings} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat tone={isClean ? "emerald" : "ink"} icon={<ShieldCheck className="w-5 h-5" />} label="Status" value={isClean ? "All clear" : "Action needed"} />
        <Stat tone="rose"   icon={<AlertOctagon className="w-5 h-5" />} label="Errors"   value={errors.length} />
        <Stat tone="amber"  icon={<AlertTriangle className="w-5 h-5" />} label="Warnings" value={warnings.length} />
        <Stat tone="ink"    icon={<Sparkles className="w-5 h-5" />} label="Affected members" value={affectedIds.size} />
      </div>

      {isClean ? (
        <section className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg">No violations detected ✨</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">All scheduled shifts comply with your active rules.</p>
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
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><SettingsIcon className="w-4 h-4" /> Active rules</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <RuleSetting label="Max weekly hours"            value={`${settings.maxWeeklyHours}h`} />
          <RuleSetting label="Max daily hours"             value={`${settings.maxDailyHours}h`} />
          <RuleSetting label="Min rest gap"                value={`${settings.minRestGapHours}h`} />
          <RuleSetting label="Meal break required after"   value={`${settings.mealBreakRequiredAfterHours}h`} />
          <RuleSetting label="Max consecutive days"        value={settings.maxConsecutiveDays} />
          <RuleSetting label="Predictive scheduling"       value={settings.predictiveSchedulingDays > 0 ? `≥${settings.predictiveSchedulingDays}d ahead` : "off"} />
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, tone = "ink" }: { icon: React.ReactNode; label: string; value: string | number; tone?: "ink" | "rose" | "amber" | "emerald" }) {
  const map: any = {
    ink:     "bg-ink-50 text-ink-700",
    rose:    "bg-rose-50 text-rose-700",
    amber:   "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${map[tone]}`}>{icon}</div>
      <div>
        <div className="text-[11px] uppercase text-ink-500 font-medium">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function RuleSetting({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-ink-200 px-3 py-2">
      <div className="text-ink-500">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
