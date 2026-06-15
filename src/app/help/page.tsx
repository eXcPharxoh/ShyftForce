import Link from "next/link";
import { ARTICLES, CATEGORIES, articlesInCategory } from "@/lib/help/registry";
import { HelpSearch } from "@/components/help/help-search";
import { ChevronRight, Clock } from "lucide-react";

export const metadata = {
  title: "Help center — ShyftForce",
  description: "Plain-English answers about scheduling, time off, clock-ins, billing, and more. Made for non-tech-savvy managers and their teams.",
};

/**
 * Help center landing. Browse-first: 8 categories of articles, each one
 * showing its full article list inline (no clicking into a category just
 * to see what's there — long page is fine, this is a help site).
 * Search at the top jumps you to any article by title/tag/summary.
 */
export default function HelpHome() {
  return (
    <div className="max-w-5xl mx-auto px-5 py-10 md:py-14">
      {/* Hero — one sentence + search */}
      <section className="text-center mb-10 md:mb-12">
        <h1 className="text-[28px] md:text-[36px] font-display font-bold leading-tight grad-text">How can we help?</h1>
        <p className="text-[15px] text-ink-300 mt-3 max-w-xl mx-auto">
          Short, plain-English articles. If you'd rather just ask, the in-app assistant (⌘K) can answer most things and do them for you.
        </p>
        <div className="mt-7 max-w-xl mx-auto">
          <HelpSearch articles={ARTICLES} />
        </div>
      </section>

      {/* Category sections — render each one with its full article list. */}
      <div className="space-y-12">
        {CATEGORIES.sort((a, b) => a.order - b.order).map(cat => {
          const items = articlesInCategory(cat.slug);
          if (items.length === 0) return null;
          return (
            <section key={cat.slug} id={cat.slug}>
              <header className="mb-4 flex items-baseline gap-3">
                <span className="text-2xl shrink-0" aria-hidden>{cat.emoji}</span>
                <div>
                  <h2 className="text-[20px] font-display font-bold text-ink-50">{cat.title}</h2>
                  <p className="text-[13px] text-ink-400 mt-0.5">{cat.description}</p>
                </div>
              </header>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {items.map(a => (
                  <li key={a.slug}>
                    <Link
                      href={`/help/${a.slug}`}
                      className="block card-hover p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition group h-full"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-ink-50 text-[14px] leading-snug">{a.title}</h3>
                        <ChevronRight className="w-4 h-4 text-ink-500 group-hover:text-brand-300 group-hover:translate-x-0.5 transition shrink-0 mt-0.5" />
                      </div>
                      <p className="text-[12.5px] text-ink-400 leading-relaxed">{a.summary}</p>
                      <div className="text-[10.5px] text-ink-500 mt-2 flex items-center gap-1.5 font-mono">
                        <Clock className="w-2.5 h-2.5" /> {a.estReadMinutes} min read
                        {a.audience !== "all" && <span className="ml-2 px-1.5 py-px rounded bg-white/[0.04] uppercase tracking-wider">{a.audience}</span>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
