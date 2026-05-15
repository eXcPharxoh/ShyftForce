import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { initials, relTime } from "@/lib/utils";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { NewPostButton } from "@/components/billboard/new-post-button";
import { PostDeleteButton } from "@/components/billboard/post-actions";

const CATEGORY_BADGE: Record<string, string> = {
  general:     "badge-gray",
  schedule:    "badge bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  policy:      "badge bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  celebration: "badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  alert:       "badge bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

export default async function BillboardPage() {
  const u = await requireUser();
  const isManager = u.role === "ADMIN" || u.role === "MANAGER";
  const posts = await prisma.billboardPost.findMany({
    where: { organizationId: u.organizationId },
    include: { author: { include: { user: true } } },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Megaphone className="w-6 h-6 text-brand-500" /> News Feed</h1>
          <p className="text-sm text-ink-500">{posts.length} announcement{posts.length === 1 ? "" : "s"}</p>
        </div>
        {isManager && <NewPostButton />}
      </header>

      <div className="space-y-3">
        {posts.map(p => {
          const catKey = p.category ?? "general";
          const badge = CATEGORY_BADGE[catKey] ?? "badge-gray";
          return (
            <article key={p.id} className="card p-5">
              <div className="flex items-center gap-2.5 mb-2">
                {p.author.user.avatar
                  ? <img src={p.author.user.avatar} alt="" className="w-9 h-9 rounded-full" />
                  : <div className="w-9 h-9 rounded-full bg-ink-200 dark:bg-ink-800 text-ink-700 dark:text-ink-300 text-xs font-semibold flex items-center justify-center">{initials(p.author.user.name)}</div>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{p.author.user.name}</div>
                  <div className="text-[11px] text-ink-500 flex items-center gap-1.5">
                    <span>{relTime(p.publishedAt)}</span>
                    <span className="text-ink-400">·</span>
                    <span className={badge}>{catKey}</span>
                  </div>
                </div>
                {isManager && <PostDeleteButton id={p.id} title={p.title} />}
              </div>
              <h2 className="font-semibold text-lg leading-snug mb-1">{p.title}</h2>
              <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">{p.body}</p>
            </article>
          );
        })}
        {posts.length === 0 && (
          <div className="card">
            <EmptyState
              icon={Megaphone}
              tone="brand"
              title="No announcements yet"
              description={isManager
                ? "Share company news, schedule updates, or shoutouts. Posts notify your whole team and show up in their notifications."
                : "Nothing posted yet. Your manager will use this space for company-wide updates."}
              action={isManager ? <NewPostButton /> : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
