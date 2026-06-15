import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, Wordmark } from "@/components/ui/logo";
import { Home, ArrowLeft } from "lucide-react";

/**
 * Lightweight layout for the public help center. Deliberately NOT the
 * app shell — we want this readable without an account so prospects can
 * browse it from a search engine. Header is a slim top bar with the
 * wordmark + a back-to-home link.
 */
export default function HelpLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-ink-950/85 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size="sm" />
            <Wordmark className="text-[15px] hidden sm:inline" />
            <span className="text-ink-500 mx-1 hidden sm:inline">/</span>
            <span className="text-[14px] text-ink-300 group-hover:text-ink-50 transition">Help</span>
          </Link>
          <div className="flex items-center gap-2 text-[13px]">
            <Link href="/help" className="text-ink-400 hover:text-ink-50 px-2.5 py-1.5 rounded transition hidden sm:inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> All articles
            </Link>
            <Link href="/" className="text-ink-400 hover:text-ink-50 px-2.5 py-1.5 rounded transition inline-flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" /> Home
            </Link>
            <Link href="/login" className="btn-primary btn-sm">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-white/[0.06] mt-16 py-8">
        <div className="max-w-5xl mx-auto px-5 text-center space-y-3">
          <div className="text-[14px] text-ink-300">
            Didn't find what you need? Email <a href="mailto:support@shyftforce.com" className="text-brand-300 underline">support@shyftforce.com</a> — we read every message.
          </div>
          <div className="text-[12px] text-ink-500">
            © {new Date().getFullYear()} ShyftForce · <Link href="/legal/terms" className="hover:text-ink-300">Terms</Link> · <Link href="/legal/privacy" className="hover:text-ink-300">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
