import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { SubCalloutClient } from "@/components/education/sub-callout-client";
import { Megaphone } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SubCalloutPage() {
  const u = await requireManagerOrAdmin();
  const now = new Date();

  const [callouts, todaysShifts, subPoolSize] = await Promise.all([
    prisma.subCallout.findMany({
      where: { organizationId: u.organizationId },
      include: {
        shift: { include: { member: { include: { user: { select: { name: true } } } }, location: { select: { name: true } } } },
        offers: { include: { sub: { include: { member: { include: { user: { select: { name: true } } } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    // Next 7 days of published teacher shifts with assigned members
    prisma.shift.findMany({
      where: {
        location: { organizationId: u.organizationId },
        status: "published",
        startsAt: { gte: now, lt: addDays(now, 7) },
        memberId: { not: null },
        // Exclude shifts that already have a callout
        subCallout: null as any,
      },
      include: {
        member: { include: { user: { select: { name: true } } } },
        location: { select: { name: true } },
        classPeriod: true,
      },
      orderBy: { startsAt: "asc" },
      take: 50,
    }),
    prisma.subPoolMember.count({ where: { organizationId: u.organizationId, isActive: true } }),
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        eyebrow="Education · Substitute callouts"
        icon={Megaphone}
        title="Sub callouts"
        subtitle="A teacher called out? Pick their shift, hit Send — matched subs get a one-tap SMS. First sub to claim wins."
      />

      <section className="card p-5 bg-gradient-to-br from-brand-50 to-amber-50 dark:from-brand-500/10 dark:to-amber-500/10 border-brand-200/60 dark:border-brand-500/30">
        <div className="text-[11px] uppercase font-semibold tracking-wider text-brand-700 dark:text-brand-300">Active sub pool</div>
        <div className="text-3xl font-bold tracking-tight-2 mt-0.5">{subPoolSize}</div>
        <p className="text-xs text-ink-500 mt-1">Subs ready to be paged. Manage at <code>/settings/sub-pool</code>.</p>
      </section>

      <SubCalloutClient
        callouts={callouts.map(c => ({
          id: c.id, status: c.status,
          teacherName: c.shift.member?.user.name ?? "(unassigned)",
          locationName: c.shift.location.name,
          startsAt: c.shift.startsAt.toISOString(),
          expiresAt: c.expiresAt.toISOString(),
          filledAt: c.filledAt?.toISOString() ?? null,
          offers: c.offers.map(o => ({
            memberName: o.sub.member.user.name,
            status: o.status,
            respondedAt: o.respondedAt?.toISOString() ?? null,
          })),
        }))}
        availableShifts={todaysShifts.map(s => ({
          id: s.id,
          teacherName: s.member?.user.name ?? "—",
          locationName: s.location.name,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          periodLabel: s.classPeriod?.name ?? (s.classPeriod ? `Period ${s.classPeriod.number}` : null),
        }))}
      />
    </div>
  );
}
