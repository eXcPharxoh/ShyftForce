import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { initials, relTime } from "@/lib/utils";
import { KudosForm } from "@/components/hr/kudos-form";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquareHeart } from "lucide-react";

export default async function KudosPage() {
  const u = await requireUser();
  const [kudos, members] = await Promise.all([
    prisma.kudos.findMany({
      where: { from: { organizationId: u.organizationId } },
      orderBy: { createdAt: "desc" }, take: 50,
      include: { from: { include: { user: true } }, to: { include: { user: true } } },
    }),
    prisma.member.findMany({
      where: { organizationId: u.organizationId, status: "active", id: { not: u.memberId } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">High Fives</h1>
        <p className="text-sm text-ink-500">Send a quick thank-you to a teammate.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Send a high five</h3>
          <KudosForm members={members.map(m => ({ id: m.id, name: m.user.name }))} />
        </section>

        <section className="lg:col-span-2 card p-4">
          <h3 className="text-sm font-semibold mb-3">Recent</h3>
          <ul className="space-y-3">
            {kudos.map(k => (
              <li key={k.id} className="flex items-start gap-3">
                {k.from.user.avatar ? <img src={k.from.user.avatar} className="w-9 h-9 rounded-full" alt="" /> : <div className="w-9 h-9 rounded-full bg-ink-200 text-xs font-semibold flex items-center justify-center">{initials(k.from.user.name)}</div>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <b>{k.from.user.name}</b> <span className="text-ink-500">→</span> <b>{k.to.user.name}</b> {k.emoji}
                  </div>
                  <div className="text-sm text-ink-700">"{k.message}"</div>
                  <div className="text-[11px] text-ink-500">{relTime(k.createdAt)}</div>
                </div>
              </li>
            ))}
            {kudos.length === 0 && (
              <li>
                <EmptyState
                  icon={MessageSquareHeart}
                  tone="brand"
                  title="No high fives yet"
                  description="Recognition is contagious. Send the first one to set the tone for your team."
                />
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
