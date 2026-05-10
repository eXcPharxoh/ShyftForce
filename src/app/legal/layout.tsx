import Link from "next/link";
import { Logo, Wordmark } from "@/components/ui/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50">
      <nav className="border-b border-ink-200/60 dark:border-ink-800/60">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size="md" />
            <Wordmark className="text-base" />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/legal/privacy" className="text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-ink-50">Privacy</Link>
            <Link href="/legal/terms"   className="text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-ink-50">Terms</Link>
            <Link href="/legal/dpa"     className="text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-ink-50">DPA</Link>
            <Link href="/login" className="btn-primary">Sign in</Link>
          </div>
        </div>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-16 prose prose-ink dark:prose-invert">
        {children}
      </article>
    </main>
  );
}
