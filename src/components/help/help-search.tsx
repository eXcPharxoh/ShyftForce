"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { HelpArticle } from "@/lib/help/registry";

/**
 * Client-side search over the article registry. The list is small (<50)
 * so a JS substring match per keystroke is fine — no need for FlexSearch
 * or a server endpoint. Results drop down under the input as you type;
 * Escape clears, click anywhere outside dismisses (handled by blur).
 *
 * Pre-rendered articles are passed in from the server page so the
 * registry itself never has to ship to the client when the search isn't
 * being used.
 */
export function HelpSearch({ articles }: { articles: HelpArticle[] }) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const terms = query.split(/\s+/);
    return articles
      .filter(a => {
        const hay = [a.title, a.summary, ...a.tags].join(" ").toLowerCase();
        return terms.every(t => hay.includes(t));
      })
      .slice(0, 8);
  }, [q, articles]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-ink-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          // Delay blur slightly so a click on a result registers before
          // we unmount the dropdown.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => { if (e.key === "Escape") { setQ(""); (e.target as HTMLInputElement).blur(); } }}
          placeholder="Search the help center…"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-9 py-3 text-[14px] text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-brand-500/40 focus:bg-white/[0.06] transition"
          autoComplete="off"
          spellCheck={false}
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-white/[0.08] transition"
          >
            <X className="w-3.5 h-3.5 text-ink-400" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {focused && q && (
        <div className="absolute top-full left-0 right-0 mt-2 card-pop p-1.5 max-h-96 overflow-y-auto z-20 text-left">
          {results.length === 0 ? (
            <div className="px-3 py-4 text-[13px] text-ink-500">
              No articles match "<span className="text-ink-300">{q}</span>". Try a different word or email{" "}
              <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support</a>.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {results.map(r => (
                <li key={r.slug}>
                  <Link
                    href={`/help/${r.slug}`}
                    className="block px-3 py-2.5 rounded-md hover:bg-white/[0.04] transition"
                  >
                    <div className="font-medium text-[14px] text-ink-50">{r.title}</div>
                    <div className="text-[12px] text-ink-400 mt-0.5 line-clamp-1">{r.summary}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
