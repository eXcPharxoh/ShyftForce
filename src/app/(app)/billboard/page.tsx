import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { initials, relTime } from "@/lib/utils";
import { Megaphone } from "lucide-react";

export default async function BillboardPage() {
  const u = await requireUser();
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
          <p className="text-sm text-ink-500">{posts.length} announcements</p>
        </div>
        <button className="btn-primary">New post</button>
      </header>

      <div className="space-y-3">
        {posts.map(p => (
          <article key={p.id} className="card p-5">
            <div className="flex items-center gap-2.5 mb-2">
              {p.author.user.avatar
                ? <img src={p.author.user.avatar} alt="" className="w-9 h-9 rounded-full" />
                : <div className="w-9 h-9 rounded-full bg-ink-200 text-xs font-semibold flex items-center justify-center">{initials(p.author.user.name)}</div>}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{p.author.user.name}</div>
                <div className="text-[11px] text-ink-500">{relTime(p.publishedAt)} · {p.category ?? "general"}</div>
              </div>
            </div>
            <h2 className="font-semibold text-lg leading-snug mb-1">{p.title}</h2>
            <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-line">{p.body}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
              <button className="hover:text-brand-600">👍 Like</button>
              <button className="hover:text-brand-600">💬 Comment</button>
            </div>
          </article>
        ))}
        {posts.length === 0 && <div className="card p-8 text-center text-sm text-ink-500">No announcements yet.</div>}
      </div>
    </div>
  );
}
