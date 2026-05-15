import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { AddClientForm } from "@/components/clients/add-form";
import { ClientRowActions } from "@/components/clients/client-row-actions";
import { Building2, DollarSign, MapPin } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const u = await requireManagerOrAdmin();
  const [clients, locations] = await Promise.all([
    prisma.clientAccount.findMany({
      where: { organizationId: u.organizationId },
      include: { locations: true },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.location.findMany({ where: { organizationId: u.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Service contracts"
        icon={Building2}
        title="Clients"
        subtitle={`${clients.length} client${clients.length === 1 ? "" : "s"} · Bill labor hours per contracted bill rate, with overtime multiplier`}
      >
        <Link href="/reports/client-billing" className="btn-outline text-xs">
          <DollarSign className="w-4 h-4" /> Billing report
        </Link>
      </PageHeader>

      <section className="card p-5">
        <h3 className="text-sm font-bold mb-3">Add a client</h3>
        <AddClientForm locations={locations.map(l => ({ id: l.id, name: l.name }))} />
      </section>

      <section className="card overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-500 dark:text-ink-400">
            No clients yet. Add your first one above — each location can be assigned to one client, and you can bill labor hours at the contracted rate.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {clients.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {c.name}
                    {!c.active && <span className="badge-gray">inactive</span>}
                  </div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">
                    ${(c.billRateCents / 100).toFixed(2)}/hr · OT ×{c.overtimeMultiplier} · {c.invoiceTerms.replace(/_/g, " ")}
                    {c.contactEmail && ` · ${c.contactEmail}`}
                  </div>
                  {c.locations.length > 0 && (
                    <div className="text-[11px] text-ink-700 dark:text-ink-300 mt-1 flex items-center gap-1 flex-wrap">
                      <MapPin className="w-3 h-3 inline" />
                      {c.locations.map((l) => l.name).join(" · ")}
                    </div>
                  )}
                </div>
                <ClientRowActions id={c.id} name={c.name} active={c.active} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
