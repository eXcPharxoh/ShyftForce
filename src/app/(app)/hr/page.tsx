import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { dateLabel, initials, relTime } from "@/lib/utils";
import { Award, Cake, FileCheck2, GraduationCap, MessageSquareHeart, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function HRPage() {
  const u = await requireUser();
  const orgId = u.organizationId;

  const [members, surveys, kudos, reminders] = await Promise.all([
    prisma.member.count({ where: { organizationId: orgId, status: "active" } }),
    prisma.survey.findMany({ where: { organizationId: orgId }, include: { responses: true } }),
    // Scope kudos to this org via the recipient — same cross-tenant leak the
    // reports page had. Without this filter we'd render every org's high-fives.
    prisma.kudos.findMany({
      where: { to: { organizationId: orgId } },
      orderBy: { createdAt: "desc" }, take: 5,
      include: { from: { include: { user: true } }, to: { include: { user: true } } },
    }),
    prisma.hRReminder.findMany({ where: { organizationId: orgId }, orderBy: { dueOn: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People operations"
        icon={Users}
        title="HR"
        subtitle="Members, recognition, surveys, onboarding."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile icon={<Users className="w-5 h-5" />} href="/hr/members" title="Members" subtitle={`${members} active`} />
        <Tile icon={<MessageSquareHeart className="w-5 h-5" />} href="/hr/kudos" title="High Fives" subtitle={`${kudos.length} recent`} />
        <Tile icon={<FileCheck2 className="w-5 h-5" />} href="/hr/surveys" title="Surveys" subtitle={`${surveys.filter(s=>s.status==='active').length} active`} />
        <Tile icon={<GraduationCap className="w-5 h-5" />} href="/hr/members" title="Onboarding" subtitle="Configure" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Recent High Fives</h3>
          {kudos.length === 0 ? (
            <EmptyState
              icon={MessageSquareHeart}
              title="No high fives yet"
              description="Recognize a teammate to kick off the recognition flywheel."
              action={<Link href="/hr/kudos" className="btn-primary">Send a high five</Link>}
            />
          ) : (
            <ul className="space-y-3">
              {kudos.map(k => (
                <li key={k.id} className="flex items-start gap-3">
                  {k.from.user.avatar ? <img src={k.from.user.avatar} className="w-8 h-8 rounded-full" alt="" /> : <div className="w-8 h-8 rounded-full bg-ink-200 text-xs font-semibold flex items-center justify-center">{initials(k.from.user.name)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm"><b>{k.from.user.name}</b> <span className="text-ink-500">→</span> <b>{k.to.user.name}</b> {k.emoji}</div>
                    <div className="text-sm text-ink-700 dark:text-ink-300">&ldquo;{k.message}&rdquo;</div>
                    <div className="text-[11px] text-ink-500">{relTime(k.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Open HR Reminders</h3>
          <ul className="space-y-1.5">
            {reminders.filter(r => !r.done).map(r => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-ink-300" />
                <span className="flex-1">{r.title}</span>
                <span className="badge-gray">{dateLabel(r.dueOn)}</span>
              </li>
            ))}
            {reminders.filter(r=>!r.done).length === 0 && <li className="text-xs text-ink-500">All caught up. 🎉</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Tile({ icon, href, title, subtitle }: { icon: React.ReactNode; href: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="card card-hover p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">{icon}</div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-ink-500">{subtitle}</div>
      </div>
    </Link>
  );
}
