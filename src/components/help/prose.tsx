import type { ReactNode } from "react";

/**
 * Article body wrapper. All help articles render their content inside
 * this so headings, paragraphs, lists, and code blocks share a single
 * consistent rhythm without each article author having to remember
 * Tailwind classes. Keeps articles readable on phones too — body text
 * stays at 15px on mobile (not the 13px we use elsewhere), since people
 * reading docs deserve calmer line heights.
 */
/**
 * Article body wrapper. Each base element gets a sensible default style
 * so article authors can write `<h3>`, `<p>`, `<ul>`, `<code>` and have
 * them render correctly without thinking about Tailwind. Mirrors the
 * spirit of @tailwindcss/typography but scoped to our color tokens.
 */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        "text-ink-200 text-[15px] leading-[1.7] max-w-2xl",
        // Headings
        "[&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:text-ink-50 [&_h2]:mt-8 [&_h2]:mb-3",
        "[&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-ink-50 [&_h3]:mt-7 [&_h3]:mb-2.5",
        "[&_h4]:text-[14px] [&_h4]:font-semibold [&_h4]:text-ink-100 [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:uppercase [&_h4]:tracking-wider [&_h4]:text-ink-300",
        // Paragraphs + lists
        "[&_p]:my-3.5",
        "[&_ul]:my-3.5 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:marker:text-ink-500",
        "[&_ol]:my-3.5 [&_ol]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:pl-1",
        // Links
        "[&_a]:text-brand-300 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-brand-200",
        // Inline code
        "[&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:text-brand-200 [&_code]:font-mono [&_code]:text-[13px]",
        // Bold
        "[&_b]:text-ink-50 [&_b]:font-semibold [&_strong]:text-ink-50 [&_strong]:font-semibold",
        // Italics
        "[&_i]:text-ink-100",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/**
 * Inline tag for "tip" / "watch out" / "remember" — uses a left border
 * + emoji so a non-tech-savvy reader can scan for the parts they care
 * about. Three flavors: tip (blue), warn (amber), note (grey).
 */
export function Callout({
  kind = "note",
  children,
  title,
}: {
  kind?: "tip" | "warn" | "note";
  children: ReactNode;
  title?: string;
}) {
  const styles =
    kind === "tip"
      ? "bg-brand-500/8 border-brand-500/30 text-ink-100"
      : kind === "warn"
        ? "bg-amber-500/8 border-amber-500/30 text-ink-100"
        : "bg-white/[0.03] border-white/[0.08] text-ink-200";
  const emoji = kind === "tip" ? "💡" : kind === "warn" ? "⚠️" : "📝";

  return (
    <div className={`my-5 rounded-lg border-l-2 ${styles} px-4 py-3 not-prose`}>
      {title && <div className="font-semibold text-ink-50 mb-1">{emoji} {title}</div>}
      <div className="text-[14px] leading-relaxed">
        {!title && <span className="mr-1">{emoji}</span>}
        {children}
      </div>
    </div>
  );
}

/**
 * Numbered step list with bigger numbers and tighter rhythm than a
 * plain ordered list. Use for procedural articles (clock-in, install
 * app, etc.) where the reader is following along. Numbers are auto-
 * derived from child index via React.Children so authors don't have
 * to renumber when they insert a step.
 */
import { Children, isValidElement } from "react";
export function Steps({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <ol className="space-y-3 not-prose my-5 ml-0 list-none">
      {items.map((child, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className="shrink-0 w-7 h-7 rounded-full bg-brand-500/15 text-brand-300 text-[13px] font-bold flex items-center justify-center mt-0.5 tabular-nums">{i + 1}</span>
          <div className="flex-1 text-[15px] leading-[1.65]">{child}</div>
        </li>
      ))}
    </ol>
  );
}

export function Step({ children }: { children: ReactNode }) {
  // Renders just its children — Steps handles the numbering wrapper.
  return <>{children}</>;
}
