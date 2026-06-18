import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PatientRatiosClient } from "@/components/settings/patient-ratios-client";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PatientRatiosPage() {
  const u = await requireManagerOrAdmin();
  const [rules, locations] = await Promise.all([
    prisma.patientRatioRule.findMany({
      where: { organizationId: u.organizationId },
      include: { location: { select: { name: true } } },
      orderBy: [{ unit: "asc" }, { role: "asc" }],
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Healthcare"
        icon={Activity}
        title="Patient-to-staff ratio rules"
        subtitle="Set the legal floor for each (unit, role). The scheduler refuses to assign shifts that would breach."
      />

      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-1">Reference: California Title 22 ratios</h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
          Most-cited US benchmark. Your jurisdiction may differ — these are starting points.
        </p>
        <table className="t-modern text-xs">
          <thead>
            <tr><th>Unit</th><th>Required ratio</th></tr>
          </thead>
          <tbody>
            <tr><td className="text-ink-100">ICU / NICU / CCU</td><td className="text-ink-200">1 RN : 2 patients</td></tr>
            <tr><td className="text-ink-100">Step-down / Telemetry</td><td className="text-ink-200">1 RN : 4 patients</td></tr>
            <tr><td className="text-ink-100">Med-surg</td><td className="text-ink-200">1 RN : 5 patients</td></tr>
            <tr><td className="text-ink-100">Emergency department</td><td className="text-ink-200">1 RN : 4 patients</td></tr>
            <tr><td className="text-ink-100">Psychiatric</td><td className="text-ink-200">1 RN : 6 patients</td></tr>
            <tr><td className="text-ink-100">Labor & delivery</td><td className="text-ink-200">1 RN : 2 patients</td></tr>
            <tr><td className="text-ink-100">Post-anesthesia (PACU)</td><td className="text-ink-200">1 RN : 2 patients</td></tr>
          </tbody>
        </table>
      </section>

      <PatientRatiosClient
        locations={locations.map(l => ({ id: l.id, name: l.name }))}
        initial={rules.map(r => ({
          id: r.id, locationId: r.locationId, locationName: r.location?.name ?? null,
          unit: r.unit, customLabel: r.customLabel, role: r.role,
          patientCount: r.patientCount, staffCount: r.staffCount,
          notes: r.notes, active: r.active,
        }))}
      />
    </div>
  );
}
