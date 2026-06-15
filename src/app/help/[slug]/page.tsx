import { notFound } from "next/navigation";
import Link from "next/link";
import { ARTICLES, getArticle, articlesInCategory, CATEGORIES } from "@/lib/help/registry";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { Metadata } from "next";

/** Pre-render every article at build time so /help/<slug> is static and SEO-friendly. */
export async function generateStaticParams() {
  return ARTICLES.map(a => ({ slug: a.slug }));
}

/** Per-article <title> and meta description for search engines. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Help — ShyftForce" };
  return {
    title: `${article.title} — ShyftForce help`,
    description: article.summary,
  };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  // Lazy-load the article component by slug. Next 15 handles the dynamic
  // import server-side at build time when combined with generateStaticParams.
  // Using a switch-style mapping rather than dynamic import string interpolation
  // because Next.js's static analyzer can't follow ${slug}.
  const ArticleComponent = (await loadArticle(slug))?.default;
  if (!ArticleComponent) notFound();

  const category = CATEGORIES.find(c => c.slug === article.category);
  const siblings = articlesInCategory(article.category).filter(a => a.slug !== slug);
  const prev = prevArticle(slug);
  const next = nextArticle(slug);

  return (
    <article className="max-w-3xl mx-auto px-5 py-10 md:py-14">
      {/* Breadcrumb */}
      <nav className="text-[12px] mb-5 flex items-center gap-1.5 text-ink-500" aria-label="Breadcrumb">
        <Link href="/help" className="hover:text-ink-300 transition">Help</Link>
        {category && (
          <>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/help#${category.slug}`} className="hover:text-ink-300 transition">{category.title}</Link>
          </>
        )}
      </nav>

      {/* Header */}
      <header className="mb-7 pb-6 border-b border-white/[0.06]">
        <h1 className="text-[26px] md:text-[32px] font-display font-bold text-ink-50 leading-tight">{article.title}</h1>
        <p className="text-[15px] text-ink-300 mt-3 leading-relaxed">{article.summary}</p>
        <div className="text-[11px] text-ink-500 mt-4 font-mono flex items-center gap-2">
          <Clock className="w-3 h-3" /> {article.estReadMinutes} min read
          {article.audience !== "all" && (
            <>
              <span className="text-ink-700">·</span>
              <span className="px-1.5 py-0.5 rounded bg-white/[0.04] uppercase tracking-wider">for {article.audience}s</span>
            </>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="article-body">
        <ArticleComponent />
      </div>

      {/* Was this helpful? */}
      <section className="mt-12 pt-6 border-t border-white/[0.06]">
        <div className="card p-5 text-center">
          <div className="text-[15px] font-semibold text-ink-50 mb-1">Was this helpful?</div>
          <p className="text-[13px] text-ink-400 mb-4">If something's still unclear, email <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support@shyftforce.com</a> with the article URL and we'll improve it.</p>
        </div>
      </section>

      {/* Prev / next navigation within the same category */}
      {(prev || next) && (
        <nav className="mt-8 grid grid-cols-2 gap-3" aria-label="Article navigation">
          {prev ? (
            <Link href={`/help/${prev.slug}`} className="card-hover p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition group">
              <div className="text-[10px] text-ink-500 font-mono uppercase tracking-wider flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Previous</div>
              <div className="text-[13px] text-ink-50 mt-0.5 line-clamp-1 group-hover:text-brand-300 transition">{prev.title}</div>
            </Link>
          ) : <div />}
          {next ? (
            <Link href={`/help/${next.slug}`} className="card-hover p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition group text-right">
              <div className="text-[10px] text-ink-500 font-mono uppercase tracking-wider flex items-center justify-end gap-1">Next <ChevronRight className="w-3 h-3" /></div>
              <div className="text-[13px] text-ink-50 mt-0.5 line-clamp-1 group-hover:text-brand-300 transition">{next.title}</div>
            </Link>
          ) : <div />}
        </nav>
      )}

      {/* Related: other articles in this category */}
      {siblings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[12px] font-mono uppercase tracking-[0.16em] text-ink-500 mb-3">More in {category?.title}</h2>
          <ul className="space-y-1">
            {siblings.map(s => (
              <li key={s.slug}>
                <Link href={`/help/${s.slug}`} className="block px-3 py-2 rounded-md hover:bg-white/[0.04] transition text-[14px] text-ink-300 hover:text-ink-50">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Article loader. Each article lives in src/components/help/articles/<slug>.tsx
// and exports a default React component. We map slug → import() so Next's
// build pipeline can statically analyze every reference.
// ───────────────────────────────────────────────────────────────────────────
async function loadArticle(slug: string) {
  switch (slug) {
    case "first-week-checklist":            return import("@/components/help/articles/first-week-checklist");
    case "inviting-your-team":              return import("@/components/help/articles/inviting-your-team");
    case "publishing-a-schedule":           return import("@/components/help/articles/publishing-a-schedule");
    case "open-shifts-marketplace":         return import("@/components/help/articles/open-shifts-marketplace");
    case "using-the-ai-assistant":          return import("@/components/help/articles/using-the-ai-assistant");
    case "install-mobile-app":              return import("@/components/help/articles/install-mobile-app");
    case "clocking-in-and-out":             return import("@/components/help/articles/clocking-in-and-out");
    case "how-pto-accrual-works":           return import("@/components/help/articles/how-pto-accrual-works");
    case "requesting-time-off":             return import("@/components/help/articles/requesting-time-off");
    case "approving-time-off":              return import("@/components/help/articles/approving-time-off");
    case "time-off-blackouts":              return import("@/components/help/articles/time-off-blackouts");
    case "fair-workweek-explained":         return import("@/components/help/articles/fair-workweek-explained");
    case "overtime-and-breaks":             return import("@/components/help/articles/overtime-and-breaks");
    case "connecting-payroll-finch":        return import("@/components/help/articles/connecting-payroll-finch");
    case "connecting-your-register-pos":    return import("@/components/help/articles/connecting-your-register-pos");
    case "changing-your-plan":              return import("@/components/help/articles/changing-your-plan");
    case "two-step-verification":           return import("@/components/help/articles/two-step-verification");
    case "downloading-your-data":           return import("@/components/help/articles/downloading-your-data");
    case "verification-email-not-arriving": return import("@/components/help/articles/verification-email-not-arriving");
    case "cant-clock-in":                   return import("@/components/help/articles/cant-clock-in");
    case "forgot-password":                 return import("@/components/help/articles/forgot-password");
    default: return null;
  }
}

function prevArticle(slug: string) {
  const i = ARTICLES.findIndex(a => a.slug === slug);
  return i > 0 ? ARTICLES[i - 1] : null;
}
function nextArticle(slug: string) {
  const i = ARTICLES.findIndex(a => a.slug === slug);
  return i >= 0 && i < ARTICLES.length - 1 ? ARTICLES[i + 1] : null;
}
