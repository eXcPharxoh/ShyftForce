import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { VERTICALS, VerticalKey } from "@/lib/verticals/config";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";
import { Logo, Wordmark } from "@/components/ui/logo";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

// Static-generated for SEO. Each industry gets its own page.
export async function generateStaticParams() {
  return Object.keys(VERTICALS)
    .filter(k => k !== "default")
    .map(vertical => ({ vertical }));
}

export async function generateMetadata({ params }: { params: Promise<{ vertical: string }> }): Promise<Metadata> {
  const { vertical } = await params;
  const v = VERTICALS[vertical as VerticalKey];
  if (!v) return { title: "ShyftForce" };
  return {
    title: `ShyftForce for ${v.label} — ${v.pitch.slice(0, 60)}…`,
    description: v.pitch,
  };
}

export default async function VerticalLandingPage({ params }: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await params;
  const v = VERTICALS[vertical as VerticalKey];
  if (!v || vertical === "default") notFound();

  const tpl = INDUSTRY_TEMPLATES.find(t => t.key === vertical);
  const highlights = v.modules.filter(m => m.highlight);
  const primary = v.modules.filter(m => m.primary && !m.hidden);

  return (
    <main className="bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50 min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-ink-950/80 backdrop-blur-xl border-b border-ink-200/60 dark:border-ink-800/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size="md" />
            <Wordmark className="text-base" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-semibold text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-ink-50 px-3">Sign in</Link>
            <Link href="/signup" className="btn-primary">Start free trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-6 ring-1 ring-brand-200/60 dark:ring-brand-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Built for {v.label} {v.emoji}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight-2 mb-6">
            Workforce management <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">made for {v.label.toLowerCase().split(" / ")[0]}</span>
          </h1>
          <p className="text-lg text-ink-600 dark:text-ink-300 max-w-2xl mx-auto mb-8">{v.pitch}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary text-lg px-6 py-3">
              Start your 7-day free trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/#pricing" className="btn-outline text-lg px-6 py-3">See pricing</Link>
          </div>
          <p className="text-xs text-ink-500 mt-3">No credit card required. Full access for 7 days.</p>
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight-2">Built-in for {v.label.toLowerCase().split(" / ")[0]} from day one</h2>
          <p className="text-sm text-ink-500 mt-2">No add-ons, no upsells. Everything you need.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {highlights.map(h => {
            const Icon = h.icon;
            return (
              <div key={h.href} className="card p-6 hover:border-brand-300 transition">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-4 ring-1 ring-brand-200/60 dark:ring-brand-500/30">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">{h.label}</h3>
              </div>
            );
          })}
        </div>
      </section>

      {/* Promo card */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="card p-8 bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-500/10 dark:to-emerald-500/10 border-brand-200/60 dark:border-brand-500/30 text-center">
          <div className="text-4xl mb-3">{v.promoCard.emoji}</div>
          <h3 className="text-2xl font-bold mb-2">{v.promoCard.title}</h3>
          <p className="text-ink-600 dark:text-ink-300 mb-4 max-w-lg mx-auto">{v.promoCard.subtitle}</p>
          <Link href="/signup" className="btn-primary inline-flex">Try it free <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </section>

      {/* Positions / shift blocks teaser */}
      {tpl && (
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-ink-500">Positions seeded automatically</h3>
              <div className="flex flex-wrap gap-1.5">
                {tpl.positions.map(p => (
                  <span key={p} className="text-xs px-2 py-1 rounded-full bg-ink-100 dark:bg-ink-800">{p}</span>
                ))}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-ink-500">Shift templates ready</h3>
              <ul className="space-y-1.5 text-sm">
                {tpl.shiftBlocks.map(b => (
                  <li key={b.name} className="flex items-center justify-between">
                    <span>{b.name}</span>
                    <span className="text-ink-500 text-xs">{b.startTime} – {b.endTime}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Full module list */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight-2 mb-6 text-center">Everything in your sidebar on day one</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {primary.map(m => (
            <div key={m.href} className="flex items-center gap-2 p-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-sm">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-500 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight-2 text-white mb-4">
            Run your {v.label.toLowerCase().split(" / ")[0]} like the best in the business
          </h2>
          <p className="text-brand-50 text-lg mb-8 max-w-xl mx-auto">7-day free trial. No credit card. No setup calls. Cancel anytime.</p>
          <Link href="/signup" className="bg-white text-brand-700 hover:bg-brand-50 font-bold rounded-xl px-8 py-4 inline-flex items-center gap-2 transition">
            Start free trial <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-200 dark:border-ink-800 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-500">
          <div className="flex items-center gap-2">
            <Logo size="sm" /><Wordmark className="text-sm" />
            <span className="ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/legal/privacy" className="hover:text-ink-900 dark:hover:text-ink-50">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-ink-900 dark:hover:text-ink-50">Terms</Link>
            <Link href="/legal/dpa" className="hover:text-ink-900 dark:hover:text-ink-50">DPA</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
