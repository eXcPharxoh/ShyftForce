import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { LostFoundClient } from "@/components/hospitality/lost-found-client";
import { Package } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LostFoundPage() {
  const u = await requireUser();
  const items = await prisma.lostFoundItem.findMany({
    where: { organizationId: u.organizationId, foundAt: { gte: addDays(new Date(), -90) } },
    include: { loggedBy: { include: { user: { select: { name: true } } } } },
    orderBy: { foundAt: "desc" },
    take: 200,
  });

  const unclaimed = items.filter(i => i.status === "unclaimed").length;

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Hospitality · Front Desk"
        icon={Package}
        title="Lost &amp; found"
        subtitle="Log items left by guests. 90-day rolling history with claim tracking."
      />

      <section className="card p-5 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-500/10 dark:to-amber-500/10 border-brand-200/60 dark:border-brand-500/30">
        <div className="text-[11px] uppercase font-semibold tracking-wider text-brand-700 dark:text-brand-300">Unclaimed items</div>
        <div className="text-3xl font-bold tracking-tight-2 mt-0.5">{unclaimed}</div>
        <p className="text-xs text-ink-500 mt-1">{items.length} total in last 90 days</p>
      </section>

      <LostFoundClient
        initial={items.map(i => ({
          id: i.id, description: i.description, foundLocation: i.foundLocation,
          foundAt: i.foundAt.toISOString(), status: i.status,
          claimedBy: i.claimedBy, claimedAt: i.claimedAt?.toISOString() ?? null,
          notes: i.notes, loggedByName: i.loggedBy?.user.name ?? null,
        }))}
      />
    </div>
  );
}
