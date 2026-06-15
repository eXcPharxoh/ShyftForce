import Link from "next/link";
import { ENTRIES, KIND_LABEL, KIND_TONE } from "@/lib/changelog";
import type { Metadata } from "next";
import { Logo, Wordmark } from "@/components/ui/logo";
import { Home, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog — ShyftForce",
  description: "What's new in ShyftForce. Releases, improvements, fixes, and behind-the-scenes work — in plain English.",
};

/**
 * Public changelog. Same lightweight chrome as /help — readable
 * without an account, pre-rendered as static HTML, edge-cacheable.
 * Newest release at top; each release has a date, title, summary, and
 * a list of changes color-coded by kind (new / improved / fixed / ops).
 */
export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 flex flex-col">
      {/* Slim public header — mirrors /help layout so the two feel like
          one section of the site. */}
      <header className="sticky top-0 z-30 bg-ink-950/85 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size="sm" />
            <Wordmark className="text-[15px] hidden sm:inline" />
            <span className="text-ink-500 mx-1 hidden sm:inline">/</span>
            <span className="text-[14px] text-ink-300 group-hover:text-ink-50 transition">Changelog</span>
          </Link>
          <div className="flex items-center gap-2 text-[13px]">
            <Link href="/help" className="text-ink-400 hover:text-ink-50 px-2.5 py-1.5 rounded transition inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Help
            </Link>
            <Link href="/" className="text-ink-400 hover:text-ink-50 px-2.5 py-1.5 rounded transition inline-flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" /> Home
            </Link>
            <Link href="/login" className="btn-primary btn-sm">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-5 py-10 md:py-14 w-full">
        {/* Hero */}
        <section className="mb-10 md:mb-12">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500 mb-2">What's new</div>
          <h1 className="text-[28px] md:text-[36px] font-display font-bold leading-tight grad-text">Every change we ship</h1>
          <p className="text-[15px] text-ink-300 mt-3 max-w-xl">
            We update ShyftForce constantly. Here's the running record — features, polish, fixes, and the behind-the-scenes work that keeps it fast.
          </p>
        </section>

        {/* Releases */}
        <div className="space-y-12">
          {ENTRIES.map(entry => (
            <article key={entry.date} className="relative">
              {/* Date strip */}
              <div className="flex items-baseline gap-3 mb-3">
                <time className="text-[12px] font-mono text-ink-500 tabular-nums shrink-0" dateTime={entry.date}>
                  {formatDate(entry.date)}
                </time>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              <h2 className="text-[20px] md:text-[22px] font-display font-bold text-ink-50 leading-tight">{entry.title}</h2>
              {entry.summary && (
                <p className="text-[14px] text-ink-300 mt-2 leading-relaxed">{entry.summary}</p>
              )}

              <ul className="mt-5 space-y-2">
                {entry.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed">
                    <span className={`shrink-0 mt-0.5 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${KIND_TONE[c.kind]}`}>
                      {KIND_LABEL[c.kind]}
                    </span>
                    <span className="text-ink-200">{c.text}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* RSS hint */}
        <div className="mt-16 text-center text-[12px] text-ink-500">
          Want updates by email instead? Drop us a line at{" "}
          <a href="mailto:hi@shyftforce.com" className="text-brand-300 underline">hi@shyftforce.com</a>{" "}
          and we'll add you to the release-notes list.
        </div>
      </main>

      <footer className="border-t border-white/[0.06] mt-16 py-8">
        <div className="max-w-3xl mx-auto px-5 text-center text-[12px] text-ink-500">
          © {new Date().getFullYear()} ShyftForce · <Link href="/legal/terms" className="hover:text-ink-300">Terms</Link> · <Link href="/legal/privacy" className="hover:text-ink-300">Privacy</Link> · <Link href="/help" className="hover:text-ink-300">Help</Link>
        </div>
      </footer>
    </div>
  );
}

/** Format ISO date as "Jun 15, 2026". */
function formatDate(iso: string): string {
  // We avoid `new Date(iso)` here because timezone shifts could push the
  // date back a day in some locales. Parse the YYYY-MM-DD as UTC noon.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
