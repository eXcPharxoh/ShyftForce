import { requireManagerOrAdmin } from "@/lib/session";
import { computeClientBilling } from "@/lib/billing/client-hours";
import { PageHeader } from "@/components/ui/page-header";
import { Building2, Download, DollarSign } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientBillingPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; source?: string }> }) {
  const u = await requireManagerOrAdmin();
  const sp = await searchParams;

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const fromStr = sp.from ?? defaultFrom.toISOString().slice(0, 10);
  const toStr   = sp.to   ?? defaultTo.toISOString().slice(0, 10);
  const source = (sp.source === "shifts" ? "shifts" : "timesheets") as "timesheets" | "shifts";

  const rows = await computeClientBilling({
    organizationId: u.organizationId,
    from: new Date(`${fromStr}T00:00:00`),
    to: new Date(`${toStr}T00:00:00`),
    source,
  });

  const totalCents = rows.reduce((a, r) => a + r.subtotalCents, 0);
  const totalHours = rows.reduce((a, r) => a + r.hoursRegular + r.hoursOvertime, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Client invoicing"
        icon={DollarSign}
        title="Client billing report"
        subtitle={`${fromStr} → ${toStr} · ${rows.length} client${rows.length === 1 ? "" : "s"} · using ${source === "timesheets" ? "approved timesheets" : "scheduled shifts"}`}
      >
        <form method="get" className="flex items-center gap-1.5">
          <input name="from" type="date" defaultValue={fromStr} className="input h-9 text-xs w-32" />
          <input name="to"   type="date" defaultValue={toStr}   className="input h-9 text-xs w-32" />
          <select name="source" defaultValue={source} className="input h-9 text-xs">
            <option value="timesheets">Timesheets</option>
            <option value="shifts">Scheduled</option>
          </select>
          <button className="btn-outline h-9 text-xs">Update</button>
        </form>
        <a href={`/api/clients/billing?from=${fromStr}&to=${toStr}&source=${source}&format=csv`} className="btn-outline text-xs">
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Total hours" value={totalHours.toFixed(1)} />
        <Stat label="Billable subtotal" value={`$${(totalCents / 100).toFixed(2)}`} tone="emerald" />
        <Stat label="Clients" value={rows.length} />
      </div>

      <section className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-500 dark:text-ink-400">
            No clients with billable hours yet. <Link href="/clients" className="text-brand-600">Add clients</Link> and assign locations to them.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-800/60 text-[11px] uppercase text-ink-600 dark:text-ink-400 font-semibold tracking-wider">
              <tr>
                <th className="text-left px-5 py-2.5">Client</th>
                <th className="text-left px-5 py-2.5">Locations</th>
                <th className="text-right px-5 py-2.5">Regular</th>
                <th className="text-right px-5 py-2.5">OT</th>
                <th className="text-right px-5 py-2.5">Rate</th>
                <th className="text-right px-5 py-2.5">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.clientId} className="border-t border-ink-100 dark:border-ink-800">
                  <td className="px-5 py-3">
                    <div className="font-semibold">{r.clientName}</div>
                    {r.contactEmail && <div className="text-[11px] text-ink-500">{r.contactEmail}</div>}
                    <div className="text-[10px] text-ink-400">{r.invoiceTerms.replace(/_/g, " ")}</div>
                  </td>
                  <td className="px-5 py-3 text-[11px] text-ink-600 dark:text-ink-400">
                    {r.byLocation.map((l) => <div key={l.locationId}>{l.locationName} · {l.hours.toFixed(1)}h</div>)}
                    {r.byLocation.length === 0 && <span>—</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{r.hoursRegular.toFixed(1)}h</td>
                  <td className="px-5 py-3 text-right tabular-nums text-amber-700">{r.hoursOvertime.toFixed(1)}h</td>
                  <td className="px-5 py-3 text-right tabular-nums">${(r.billRateCents / 100).toFixed(2)}/h</td>
                  <td className="px-5 py-3 text-right tabular-nums font-bold">${(r.subtotalCents / 100).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink-300 dark:border-ink-700 bg-ink-50/30 dark:bg-ink-900/30 font-bold">
                <td colSpan={5} className="px-5 py-3 text-right">Total</td>
                <td className="px-5 py-3 text-right tabular-nums text-lg">${(totalCents / 100).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "emerald" }) {
  const cls = tone === "emerald" ? "text-emerald-700 dark:text-emerald-300" : "text-ink-900 dark:text-ink-50";
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase text-ink-500 font-semibold tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 ${cls}`}>{value}</div>
    </div>
  );
}
