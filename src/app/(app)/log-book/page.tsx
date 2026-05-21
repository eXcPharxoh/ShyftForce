import { requireManagerOrAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { LogBookClient } from "@/components/log-book/log-book-client";
import { BookOpen } from "lucide-react";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LogBookPage() {
  const u = await requireManagerOrAdmin();

  const [entries, locations] = await Promise.all([
    prisma.shiftLogEntry.findMany({
      where: {
        organizationId: u.organizationId,
        occurredOn: { gte: addDays(new Date(), -60) },
      },
      include: {
        author:   { include: { user: { select: { name: true } } } },
        location: { select: { name: true } },
      },
      orderBy: { occurredOn: "desc" },
      take: 200,
    }),
    prisma.location.findMany({
      where: { organizationId: u.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const openFollowUps = entries.filter(e => e.followUpRequired && !e.resolvedAt).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        eyebrow="Manager only"
        icon={BookOpen}
        title="Shift log book"
        subtitle="Daily recaps, incidents, VIP notes, equipment issues — a private journal for the management team. Different from the staff-facing News Feed."
      />

      {openFollowUps > 0 && (
        <section className="card p-4 bg-warn/8 border-warn/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-warn/15 text-warn flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-warn">{openFollowUps} entry{openFollowUps === 1 ? "" : "ies"} needs follow-up</div>
              <div className="text-[11px] text-ink-500 mt-0.5">Mark resolved once handled.</div>
            </div>
          </div>
        </section>
      )}

      <LogBookClient
        initial={entries.map(e => ({
          id: e.id,
          occurredOn: e.occurredOn.toISOString().slice(0, 10),
          category: e.category,
          title: e.title,
          body: e.body,
          authorName: e.author.user.name,
          locationName: e.location?.name ?? null,
          followUpRequired: e.followUpRequired,
          resolvedAt: e.resolvedAt?.toISOString() ?? null,
          createdAt: e.createdAt.toISOString(),
        }))}
        locations={locations}
      />
    </div>
  );
}
