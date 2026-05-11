import Link from "next/link";
import {
  Sparkles, ShieldCheck, Workflow, MapPin, ShoppingBag, BarChart3,
  CheckCircle2, ArrowRight, Star, Building2, Utensils, ShoppingCart,
  Stethoscope, HardHat, Briefcase, Dumbbell, Zap, Users, Clock, MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { Logo, Wordmark } from "@/components/ui/logo";

export function LandingPage() {
  return (
    <main className="bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50 min-h-screen">
      <MarketingNav />
      <Hero />
      <SocialProof />
      <Features />
      <Industries />
      <ProductShowcase />
      <Pricing />
      <Testimonials />
      <FinalCTA />
      <MarketingFooter />
    </main>
  );
}

/* ------------------- NAV ------------------- */
function MarketingNav() {
  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-ink-950/80 backdrop-blur-xl border-b border-ink-200/60 dark:border-ink-800/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size="md" />
          <Wordmark className="text-base" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-700 dark:text-ink-300">
          <a href="#features" className="hover:text-ink-900 dark:hover:text-ink-50">Features</a>
          <a href="#industries" className="hover:text-ink-900 dark:hover:text-ink-50">Industries</a>
          <a href="#pricing" className="hover:text-ink-900 dark:hover:text-ink-50">Pricing</a>
          <a href="#customers" className="hover:text-ink-900 dark:hover:text-ink-50">Customers</a>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm font-semibold text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-ink-50 px-3">Sign in</Link>
          <Link href="/signup" className="btn-primary">Start free trial</Link>
        </div>
      </div>
    </nav>
  );
}

/* ------------------- HERO ------------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-faint bg-[length:32px_32px] opacity-40 dark:opacity-20 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 badge-orange mb-6 animate-fade-up">
          <Sparkles className="w-3 h-3" /> Now with AI Co-pilot · Auto-Scheduler · Compliance Autopilot
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight-2 leading-[0.98] max-w-4xl mx-auto animate-fade-up">
          The workforce platform that{" "}
          <span className="text-gradient-brand">runs itself.</span>
        </h1>
        <p className="text-lg md:text-xl text-ink-600 dark:text-ink-300 mt-6 max-w-2xl mx-auto leading-relaxed animate-fade-up">
          AI-powered scheduling, geofenced clock-in, real-time compliance, and a smart open-shift marketplace —
          all in one place. Built for restaurants, retail, healthcare, security, and field services.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Start 14-day free trial <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="btn-outline px-6 py-3 text-base">
            View live demo
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> No credit card required</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Set up in 5 minutes</span>
          <span className="inline-flex items-center gap-1.5 hidden md:inline-flex"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Cancel anytime</span>
        </div>

        {/* Hero product screenshot — abstract preview */}
        <div className="mt-16 relative max-w-5xl mx-auto animate-fade-up">
          <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/40 via-rose-500/40 to-brand-500/40 blur-2xl rounded-3xl" />
          <div className="relative card overflow-hidden p-0 shadow-card-hover">
            <div className="h-8 bg-ink-100 dark:bg-ink-900 border-b border-ink-200 dark:border-ink-800 flex items-center px-3 gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-ink-500 ml-2 font-mono">app.shyftforce.com/dashboard</span>
            </div>
            <div className="grid grid-cols-12 gap-0 h-[420px] bg-ink-50 dark:bg-ink-900/50">
              <div className="col-span-2 bg-white dark:bg-ink-950 border-r border-ink-200 dark:border-ink-800 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Logo size="sm" />
                  <span className="text-xs font-bold">shyftforce</span>
                </div>
                {[ "Home", "Schedule", "Open Shifts", "Time Off", "Attendance", "HR", "Reports" ].map((n, i) => (
                  <div key={n} className={`text-[11px] px-2 py-1.5 rounded-lg ${i === 1 ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold" : "text-ink-600 dark:text-ink-400"}`}>
                    {n}
                  </div>
                ))}
              </div>
              <div className="col-span-10 p-6">
                <div className="h-7 w-48 bg-ink-200 dark:bg-ink-800 rounded mb-2" />
                <div className="h-4 w-72 bg-ink-200 dark:bg-ink-800 rounded mb-6 opacity-60" />
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, d) => (
                    <div key={d} className="space-y-1.5">
                      <div className="h-5 bg-ink-200 dark:bg-ink-800 rounded" />
                      {Array.from({ length: 3 + (d % 2) }).map((_, s) => (
                        <div key={s} className={`h-12 rounded-lg ${["bg-brand-200/70 dark:bg-brand-500/30", "bg-emerald-200/70 dark:bg-emerald-500/30", "bg-sky-200/70 dark:bg-sky-500/30", "bg-amber-200/70 dark:bg-amber-500/30"][s % 4]}`} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------- SOCIAL PROOF ------------------- */
function SocialProof() {
  return (
    <section className="border-y border-ink-200/60 dark:border-ink-800/60 bg-ink-50/50 dark:bg-ink-900/30 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-6">
          Trusted by teams of all sizes
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-ink-400 dark:text-ink-500 font-bold text-lg">
          {["PLATINUM", "Yoko Luna", "Supermarché PA", "PANGEA", "9487 Québec", "+ 200 more"].map(n => (
            <span key={n} className="opacity-70 hover:opacity-100 transition tracking-wide">{n}</span>
          ))}
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { stat: "30-50%", label: "Fewer no-shows" },
            { stat: "12+ hrs",  label: "Saved per manager / week" },
            { stat: "<5 min",   label: "Setup with templates" },
            { stat: "99.9%",    label: "Uptime SLA" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-bold tracking-tight-2 text-gradient-brand">{s.stat}</div>
              <div className="text-xs text-ink-500 dark:text-ink-400 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------- FEATURES ------------------- */
const FEATURES = [
  { icon: Sparkles,    title: "AI Co-pilot",          body: "Type \"schedule Jordan and Aisha at yoko luna for Saturday 6pm-2am\" — done. Reports, kudos, replacements: all in plain English.", accent: "brand" },
  { icon: Workflow,    title: "Auto-Scheduler",        body: "Generate a full week from your coverage rules in seconds. Honors time-off, hours caps, position match, and last week's patterns.", accent: "rose" },
  { icon: ShieldCheck, title: "Compliance Autopilot",  body: "Live OT, meal-break, rest-gap, consecutive-day, and Fair Workweek checks. Flagged before you publish.", accent: "amber" },
  { icon: ShoppingBag, title: "Open-Shift Marketplace", body: "Auto-offer in waves to ranked candidates. Race-safe claiming. Reduces no-shows by 30-50% in real deployments.", accent: "emerald" },
  { icon: MapPin,      title: "Geofenced clock-in",    body: "GPS + selfie verification. See proof-of-presence per shift. Universal across security, retail, healthcare, services.", accent: "sky" },
  { icon: BarChart3,   title: "Real-time analytics",   body: "Labor cost by location, hours by day, OT trends, attendance — live from your data, not last month's CSV.", accent: "violet" },
];
function Features() {
  return (
    <section id="features" className="py-24 max-w-6xl mx-auto px-6">
      <div className="text-center mb-14">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Everything you need</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight-2">A workforce OS, not a spreadsheet.</h2>
        <p className="text-ink-600 dark:text-ink-400 mt-4 max-w-2xl mx-auto">
          The features Deputy, When I Work, and Sling charge add-ons for — built into every plan.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map(f => {
          const Icon = f.icon;
          const colorMap: Record<string, string> = {
            brand:   "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
            rose:    "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
            amber:   "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
            emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
            sky:     "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
            violet:  "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
          };
          return (
            <div key={f.title} className="card p-6 card-hover">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[f.accent]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg mt-4">{f.title}</h3>
              <p className="text-sm text-ink-600 dark:text-ink-400 mt-1.5 leading-relaxed">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------- INDUSTRIES ------------------- */
function Industries() {
  const items = [
    { icon: Utensils,    label: "Restaurant" },
    { icon: ShoppingBag, label: "Grocery" },
    { icon: ShieldAlert, label: "Security" },
    { icon: ShoppingCart, label: "Retail" },
    { icon: Stethoscope, label: "Healthcare" },
    { icon: HardHat,     label: "Field Service" },
    { icon: Briefcase,   label: "Office" },
    { icon: Dumbbell,    label: "Fitness" },
  ];
  return (
    <section id="industries" className="bg-ink-50 dark:bg-ink-900/40 border-y border-ink-200/60 dark:border-ink-800/60 py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Built for your industry</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight-2">Pre-configured for the way you work.</h2>
          <p className="text-ink-600 dark:text-ink-400 mt-4 max-w-2xl mx-auto">
            Pick a template at signup. Positions, shift blocks, geofence radius, compliance rules — all set in one click.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {items.map(({ icon: Icon, label }) => (
            <div key={label} className="card p-5 text-center card-hover">
              <Icon className="w-7 h-7 mx-auto text-brand-500 dark:text-brand-400" />
              <div className="font-semibold text-sm mt-3">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------- PRODUCT SHOWCASE ------------------- */
function ProductShowcase() {
  const blocks = [
    {
      eyebrow: "AI Co-pilot",
      title: "Cmd+K, ask anything.",
      body: "Schedule shifts, find replacements, pull reports, send kudos — all from a single text box. Powered by Claude.",
      bullets: [
        "\"Who's worked the most overtime this period?\"",
        "\"Find a replacement for Liam's Friday night shift.\"",
        "\"Send Sarah a high five for covering last week.\"",
      ],
      icon: Sparkles,
    },
    {
      eyebrow: "Compliance Autopilot",
      title: "Stop violations before they happen.",
      body: "Six rule families enforced live: weekly OT, daily OT, rest gaps, meal breaks, consecutive days, Fair Workweek. Configurable thresholds per org.",
      bullets: ["NYC / Seattle / Oregon predictive scheduling", "Custom severity per rule", "Audit log on every change"],
      icon: ShieldCheck,
    },
    {
      eyebrow: "Open-Shift Marketplace",
      title: "Fill gaps without firing off 12 texts.",
      body: "Click \"Auto-offer\" → top 3 candidates get DMs → first to claim wins. Race-safe transactional claiming. Broaden in waves if no one bites.",
      bullets: ["Ranked by location · position · hours · availability", "Push notifications via PWA", "Manager auto-notified on claim"],
      icon: ShoppingBag,
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 space-y-24">
      {blocks.map((b, i) => {
        const Icon = b.icon;
        const flip = i % 2 === 1;
        return (
          <div key={b.title} className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className={flip ? "md:order-2" : ""}>
              <div className="inline-flex items-center gap-2 badge-orange mb-4">
                <Icon className="w-3 h-3" /> {b.eyebrow}
              </div>
              <h3 className="text-3xl md:text-4xl font-bold tracking-tight-2 leading-tight">{b.title}</h3>
              <p className="text-ink-600 dark:text-ink-400 mt-4 leading-relaxed">{b.body}</p>
              <ul className="mt-6 space-y-2.5">
                {b.bullets.map(bb => (
                  <li key={bb} className="flex items-start gap-2.5 text-sm text-ink-700 dark:text-ink-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{bb}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`relative h-[320px] rounded-2xl bg-gradient-to-br from-brand-500/10 via-rose-500/5 to-brand-500/10 dark:from-brand-500/20 dark:via-rose-500/10 dark:to-brand-500/20 border border-ink-200/70 dark:border-ink-800/70 overflow-hidden ${flip ? "md:order-1" : ""}`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon className="w-32 h-32 text-brand-500/20" />
              </div>
              <div className="absolute bottom-6 left-6 right-6 card p-3.5">
                <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live preview
                </div>
                <div className="font-semibold text-sm">{b.eyebrow} works in production today</div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ------------------- PRICING ------------------- */
function Pricing() {
  const tiers = [
    { name: "Starter",    price: 29,  seats: "10",  cta: "Start free trial",       features: ["All scheduling + payroll", "AI Co-pilot & Auto-Scheduler", "Compliance Autopilot", "Geofenced clock-in", "Email support"] },
    { name: "Pro",        price: 79,  seats: "100", cta: "Start free trial", featured: true, features: ["Everything in Starter", "Open-Shift Marketplace", "Advanced analytics", "Audit log + GDPR tools", "Priority support"] },
    { name: "Enterprise", price: null, seats: "∞",  cta: "Contact sales",          features: ["Everything in Pro", "SSO (SAML)", "Custom SLA · 99.99%", "Dedicated CSM", "On-premise option"] },
  ];
  return (
    <section id="pricing" className="py-24 bg-ink-50 dark:bg-ink-900/40 border-y border-ink-200/60 dark:border-ink-800/60">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Pricing</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight-2">Simple, seat-based.</h2>
          <p className="text-ink-600 dark:text-ink-400 mt-4 max-w-xl mx-auto">
            14-day free trial. No credit card. Switch tiers anytime.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {tiers.map(t => (
            <div key={t.name} className={`card p-7 relative ${t.featured ? "ring-2 ring-brand-500 shadow-card-hover scale-[1.02]" : ""}`}>
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-orange flex items-center gap-1 px-3 py-1">
                  <Star className="w-3 h-3 fill-brand-700" /> Most popular
                </div>
              )}
              <div className="font-bold text-lg">{t.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                {t.price != null
                  ? <><span className="text-5xl font-bold tracking-tight-2">${t.price}</span><span className="text-sm text-ink-500 dark:text-ink-400">/mo</span></>
                  : <span className="text-5xl font-bold tracking-tight-2">Custom</span>}
              </div>
              <div className="text-xs text-ink-500 dark:text-ink-400 mt-1">Up to {t.seats} {t.seats === "∞" ? "" : "seats"}</div>
              <Link href={t.cta === "Contact sales" ? "mailto:sales@shyftforce.com" : "/signup"}
                    className={t.featured ? "btn-primary w-full mt-6 py-2.5" : "btn-outline w-full mt-6 py-2.5"}>
                {t.cta}
              </Link>
              <ul className="mt-6 space-y-2 text-sm">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-ink-700 dark:text-ink-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------- TESTIMONIALS ------------------- */
function Testimonials() {
  const reviews = [
    {
      quote: "We went from 8 hours a week building schedules in Excel to literally 4 minutes with the AI Co-pilot. It's like having a manager assistant that never sleeps.",
      author: "Sarah Tremblay",
      role: "Site Manager · Platinum Security",
    },
    {
      quote: "The open-shift marketplace cut our no-show rate in half. Employees actually want to pick up shifts now because they hear about them first.",
      author: "Marc-Antoine Roy",
      role: "Operations · Supermarché PA",
    },
    {
      quote: "Compliance Autopilot caught three OT violations our old system missed. That alone paid for the year.",
      author: "Léa Beaulieu",
      role: "HR Lead · 9487 Québec inc",
    },
  ];
  return (
    <section id="customers" className="py-24 max-w-6xl mx-auto px-6">
      <div className="text-center mb-14">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">Customers</div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight-2">Teams who switched, never went back.</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {reviews.map(r => (
          <div key={r.author} className="card p-6 flex flex-col">
            <div className="flex gap-0.5 text-brand-500 mb-3">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed flex-1">"{r.quote}"</p>
            <div className="mt-5 pt-5 border-t border-ink-100 dark:border-ink-800">
              <div className="font-semibold text-sm">{r.author}</div>
              <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">{r.role}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------- FINAL CTA ------------------- */
function FinalCTA() {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-rose-500 text-white p-10 md:p-16 text-center">
          <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight-2 leading-tight">
              Stop running your team on Excel + WhatsApp.
            </h2>
            <p className="text-white/85 text-lg mt-4 max-w-2xl mx-auto">
              Set up your workspace in 5 minutes. 14-day trial. No credit card. Cancel anytime.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="bg-white text-brand-700 hover:bg-white/95 btn px-6 py-3 text-base shadow-soft">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="mailto:sales@shyftforce.com" className="text-white/90 hover:text-white text-sm font-semibold underline-offset-4 hover:underline px-3">
                Talk to sales →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------- FOOTER ------------------- */
function MarketingFooter() {
  return (
    <footer className="border-t border-ink-200/60 dark:border-ink-800/60 bg-ink-50/50 dark:bg-ink-900/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo size="md" />
              <Wordmark className="text-base" />
            </div>
            <p className="text-sm text-ink-500 dark:text-ink-400 mt-4 max-w-sm">
              Workforce management that runs itself. AI-first, compliance-ready, built for multi-location teams.
            </p>
          </div>
          <FooterCol title="Product" items={[
            { label: "Features", href: "#features" },
            { label: "Pricing", href: "#pricing" },
            { label: "Industries", href: "#industries" },
            { label: "Customers", href: "#customers" },
          ]} />
          <FooterCol title="Company" items={[
            { label: "About", href: "#" },
            { label: "Careers", href: "#" },
            { label: "Contact", href: "mailto:hello@shyftforce.com" },
            { label: "Status", href: "#" },
          ]} />
          <FooterCol title="Legal" items={[
            { label: "Privacy", href: "/legal/privacy" },
            { label: "Terms", href: "/legal/terms" },
            { label: "DPA", href: "/legal/dpa" },
            { label: "Security", href: "#" },
          ]} />
        </div>
        <div className="mt-12 pt-6 border-t border-ink-200/60 dark:border-ink-800/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-ink-500 dark:text-ink-400">
          <div>© {new Date().getFullYear()} shyftforce. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> All systems operational</span>
            <span>SOC 2 in progress</span>
            <span>GDPR-ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500 mb-3">{title}</div>
      <ul className="space-y-2">
        {items.map(i => (
          <li key={i.label}>
            <Link href={i.href} className="text-sm text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-ink-50">{i.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
