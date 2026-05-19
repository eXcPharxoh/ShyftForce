import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Form8027Client } from "@/components/reports/form-8027-client";
import { FileBarChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Form8027Page() {
  const u = await requireManagerOrAdmin();
  const locations = await prisma.location.findMany({
    where: { organizationId: u.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        eyebrow="Tax & compliance"
        icon={FileBarChart}
        title="IRS Form 8027 export"
        subtitle="Annual workpaper for tipped-employee tax reporting. Hand it to your accountant for line-by-line transcription onto the official form."
      />
      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-1">Who needs this?</h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
          The IRS requires Form 8027 from any "large food or beverage establishment" — 10+ employees in the typical workday providing food/drink for on-premise consumption.
          The form reports total tips, gross receipts, and an 8%-of-gross allocation if reported tips fall short.
        </p>
        <h3 className="text-sm font-semibold mb-1 mt-3">What our export gives you</h3>
        <ul className="text-xs text-ink-500 dark:text-ink-400 space-y-0.5 list-disc list-inside">
          <li>Line-by-line workpaper with every box pre-computed</li>
          <li>Per-employee tip allocation rows (in case reported tips &lt; 8% floor)</li>
          <li>Gross receipts pulled from your POS data</li>
          <li>One CSV, downloadable in 2 seconds, replaces $2-5k of accountant prep work</li>
        </ul>
      </section>
      <Form8027Client locations={locations} />
    </div>
  );
}
