import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { VisitorsClient } from "@/components/office/visitors-client";
import { UserPlus } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VisitorsPage() {
  const u = await requireUser();
  const [visitors, members] = await Promise.all([
    prisma.visitor.findMany({
      where: { organizationId: u.organizationId, checkedInAt: { gte: addDays(new Date(), -7) } },
      include: { host: { include: { user: { select: { name: true } } } } },
      orderBy: { checkedInAt: "desc" },
      take: 200,
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const onSite = visitors.filter(v => !v.checkedOutAt).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Office · Reception"
        icon={UserPlus}
        title="Visitor log"
        subtitle="Sign guests in, notify the host, and keep a 7-day on-site roster ready for evacuation drills."
      />

      <section className="card p-5 bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-500/10 dark:to-emerald-500/10 border-brand-200/60 dark:border-brand-500/30">
        <div className="text-[11px] uppercase font-semibold tracking-wider text-brand-700 dark:text-brand-300">On site right now</div>
        <div className="text-3xl font-bold tracking-tight-2 mt-0.5">{onSite}</div>
        <p className="text-xs text-ink-500 mt-1">{visitors.length} total visit{visitors.length === 1 ? "" : "s"} in last 7 days</p>
      </section>

      <VisitorsClient
        initial={visitors.map(v => ({
          id: v.id, name: v.name, company: v.company, badgeNumber: v.badgeNumber, purpose: v.purpose,
          checkedInAt: v.checkedInAt.toISOString(),
          checkedOutAt: v.checkedOutAt?.toISOString() ?? null,
          hostName: v.host.user.name, hostMemberId: v.hostMemberId,
        }))}
        members={members.map(m => ({ id: m.id, name: m.user.name }))}
      />
    </div>
  );
}
