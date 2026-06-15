"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Play, Check, ChevronRight, MapPin, ShieldCheck, Camera, Minus, Plus, X } from "lucide-react";
import { Bolt, Wordmark } from "@/components/ui/logo";
import { GeoMap } from "@/components/geo/geo-map";

/**
 * ShyftForce marketing landing page.
 * Recreated from design_handoff_shyftforce — navy + electric-blue,
 * General Sans display + Geist body + JetBrains mono.
 *
 * Single client component; sections are local helpers. No SSR needed — all
 * data is static; mocks are decorative.
 */
export function LandingPage() {
  return (
    <main className="bg-ink-950 text-ink-50 min-h-screen overflow-x-hidden relative">
      {/* Top fade — content scrolling under the floating nav pill fades out
          so it doesn't visually conflict with the pill nav's empty sides */}
      <div className="fixed top-0 inset-x-0 h-24 z-40 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(5,8,16,0.85) 0%, rgba(5,8,16,0.5) 60%, transparent 100%)" }} />
      <Nav />
      <Hero />
      <TrustMarquee />
      <MetricsStrip />
      <FeaturesBento />
      <GeofenceShowcase />
      <IndustriesSwitcher />
      <DeepDives />
      <Pricing />
      <ComparisonTable />
      <Customers />
      <FAQ />
      <FinalCTA />
      <MarketingFooter />
      <MobileStickyCTA />
    </main>
  );
}

/* ============================================================================
   SCROLL REVEAL
   ============================================================================ */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.18 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ============================================================================
   COUNTER (cubic ease-out, 1600ms)
   ============================================================================ */
function Counter({ to, suffix = "", prefix = "", decimals = 0 }: { to: number; suffix?: string; prefix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      let raf = 0;
      let start: number | undefined;
      const step = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / 1600);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(to * eased);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      io.disconnect();
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to]);
  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

/* ============================================================================
   NAV — sticky pill, frosted on scroll
   ============================================================================ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className="fixed top-0 inset-x-0 z-50 py-3.5">
      <div className={`container-wide flex items-center justify-between transition-all duration-300 rounded-full backdrop-blur-xl border ${
        scrolled
          ? "bg-ink-900/70 border-white/20 px-4 py-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]"
          : "bg-ink-900/40 border-white/[0.06] px-5 py-2.5"
      }`} style={{ backdropFilter: "blur(20px) saturate(160%)" }}>
        <Link href="/" className="flex items-center gap-2">
          <Bolt size={20} />
          <Wordmark className="text-[18px]" />
        </Link>
        <div className="hidden md:flex items-center gap-1">
          {[
            { l: "Product",    h: "#features" },
            { l: "Industries", h: "#industries" },
            { l: "Pricing",    h: "#pricing" },
            { l: "FAQ",        h: "#faq" },
            { l: "Changelog",  h: "/changelog" },
          ].map(item => (
            <a key={item.l} href={item.h} className="text-[13.5px] text-ink-300 hover:text-ink-50 px-3.5 py-2 rounded-full hover:bg-white/[0.04] transition-all">
              {item.l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-[13.5px] text-ink-300 hover:text-ink-50 px-3.5 py-2 transition">Sign in</Link>
          <Link href="/signup" className="btn-primary btn-sm">
            Start free trial <ArrowRight className="w-3.5 h-3.5 arrow" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ============================================================================
   HERO
   ============================================================================ */
function Hero() {
  return (
    <section className="relative pt-40 pb-20 overflow-hidden">
      <HeroBackdrop />
      <div className="container relative z-10 text-center">
        <Reveal>
          <div className="pill-accent mb-7">
            <Bolt size={14} />
            <span>Now with AI Co-pilot · Auto-Scheduler · Compliance 2.0</span>
            <ChevronRight className="w-3.5 h-3.5 text-brand-500" />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="h-hero max-w-[1100px] mx-auto">
            <span className="grad-text">Run your team </span>
            <br />
            <span className="grad-text">on </span>
            <span className="grad-text-accent font-normal">autopilot.</span>
          </h1>
        </Reveal>

        <Reveal delay={250}>
          <p className="text-[19px] leading-[1.5] text-ink-300 max-w-[720px] mx-auto mt-8 font-normal">
            Get back <b className="text-ink-50">8 hours a week</b>. AI builds the schedule. Geofenced clock-in stops time theft. Compliance catches violations before they hit payroll. One app for your whole operation — set up in 5 minutes.
          </p>
        </Reveal>

        <Reveal delay={400}>
          <div className="flex flex-wrap gap-3 justify-center mt-10">
            <Link href="/signup" className="btn-primary">
              Get started free <ArrowRight className="w-4 h-4 arrow" />
            </Link>
            <a href="#features" className="btn-ghost">
              <Play className="w-3 h-3 fill-current" /> See it in action
            </a>
          </div>
          <div className="mt-5 text-xs text-ink-500 flex flex-wrap justify-center gap-x-5 gap-y-1">
            <span><Check className="w-3 h-3 inline-block text-success mr-1" />No credit card required</span>
            <span><Check className="w-3 h-3 inline-block text-success mr-1" />5-minute setup</span>
            <span><Check className="w-3 h-3 inline-block text-success mr-1" />Free forever for up to 5 employees</span>
          </div>
        </Reveal>

        <Reveal delay={500}>
          <a href="#customers" className="inline-flex items-center gap-3 mt-7 px-3.5 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition group">
            <div className="flex -space-x-1.5">
              <div className="w-6 h-6 rounded-full ring-2 ring-ink-950" style={{ background: "linear-gradient(135deg,#a78bff,#6aa2ff)" }} />
              <div className="w-6 h-6 rounded-full ring-2 ring-ink-950" style={{ background: "linear-gradient(135deg,#4ee0c5,#6aa2ff)" }} />
              <div className="w-6 h-6 rounded-full ring-2 ring-ink-950" style={{ background: "linear-gradient(135deg,#f5b544,#a78bff)" }} />
            </div>
            <div className="text-[12px] text-ink-300">
              <b className="text-ink-50">12+ industries</b> · restaurants, retail, security, healthcare & more
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-ink-500 group-hover:text-brand-300 transition" />
          </a>
        </Reveal>

        <Reveal delay={600}>
          <div className="mt-20">
            <HeroProduct />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function HeroBackdrop() {
  return (
    <div className="absolute inset-0 -z-0 overflow-hidden pointer-events-none">
      <div className="absolute left-1/2 -translate-x-1/2 top-[5%] w-[1100px] h-[1100px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(106,162,255,0.25) 0%, rgba(106,162,255,0.08) 30%, transparent 60%)", filter: "blur(40px)" }} />
      <div className="absolute left-[10%] top-[40%] w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(78,224,197,0.12), transparent 60%)", filter: "blur(60px)" }} />
      <div className="absolute inset-0 grid-bg"
        style={{ maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 70%)" }} />
    </div>
  );
}

function HeroProduct() {
  return (
    <div className="relative max-w-[1200px] mx-auto">
      <div className="absolute -inset-10 -bottom-2 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(106,162,255,0.3), transparent 70%)", filter: "blur(40px)" }} />
      <div className="relative rounded-3xl overflow-hidden border border-white/20"
        style={{
          background: "linear-gradient(180deg, #0e1626 0%, #080d18 100%)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset, 0 60px 120px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(106,162,255,0.15)",
        }}>
        <div className="flex items-center gap-3.5 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex gap-1.5">
            {[0,1,2].map(i => <div key={i} className="w-3 h-3 rounded-full bg-[#3a3f4d]" />)}
          </div>
          <div className="flex-1 flex items-center justify-center gap-2 text-xs text-ink-500">
            <Bolt size={12} glow={false} />
            <span className="font-mono">app.shyftforce.com/schedule</span>
          </div>
          <kbd className="kbd">⌘K</kbd>
        </div>

        <div className="grid grid-cols-[210px_1fr] min-h-[540px]">
          <div className="border-r border-white/[0.06] p-3 bg-black/20">
            <div className="px-2 pb-3.5 flex items-center gap-2">
              <Bolt size={16} />
              <span className="font-semibold text-[13px]">Yoko Luna</span>
            </div>
            {[
              { i: "⌂", l: "Home" },
              { i: "◷", l: "Schedule", active: true },
              { i: "◬", l: "Open Shifts", badge: 3 },
              { i: "☼", l: "Time Off" },
              { i: "✓", l: "Attendance" },
              { i: "◐", l: "HR" },
              { i: "◫", l: "Reports" },
            ].map(n => (
              <div key={n.l} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] mb-0.5 border ${
                n.active ? "bg-brand-500/12 text-brand-300 border-brand-500/25" : "text-ink-300 border-transparent"
              }`}>
                <span className="text-[13px] opacity-70 w-3.5 text-center">{n.i}</span>
                <span className="flex-1">{n.l}</span>
                {n.badge && <span className="text-[10px] px-1.5 py-0.5 bg-brand-500 text-white rounded-full font-semibold">{n.badge}</span>}
              </div>
            ))}
            <div className="h-px bg-white/[0.06] mx-2 my-3" />
            <div className="px-2 text-[10px] text-ink-500 uppercase tracking-[0.1em] mb-2">Locations</div>
            {[
              { l: "Yoko Luna · Mile End", on: true },
              { l: "Yoko Luna · Plateau",  on: false },
            ].map(loc => (
              <div key={loc.l} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-ink-300">
                <div className={`w-1.5 h-1.5 rounded-full ${loc.on ? "bg-success" : "bg-ink-600"}`} />
                {loc.l}
              </div>
            ))}
          </div>

          <div className="flex flex-col">
            <div className="px-5 py-3.5 flex items-center gap-3 border-b border-white/[0.06]">
              <span className="font-display font-semibold text-[18px]">Week of May 19</span>
              <div className="flex gap-1">
                <button className="w-6 h-6 border border-white/20 text-ink-300 rounded-md text-xs">‹</button>
                <button className="w-6 h-6 border border-white/20 text-ink-300 rounded-md text-xs">›</button>
              </div>
              <div className="flex-1" />
              <span className="status status-success text-[11px]">Compliance: 100%</span>
              <button className="btn-ghost btn-sm">Auto-Schedule <ArrowRight className="w-3 h-3 arrow" /></button>
              <button className="btn-primary btn-sm">Publish</button>
            </div>
            <ScheduleGrid />
          </div>
        </div>
      </div>
      <CopilotBubble />
    </div>
  );
}

function ScheduleGrid() {
  const days = ["Mon 19", "Tue 20", "Wed 21", "Thu 22", "Fri 23", "Sat 24", "Sun 25"];
  type Cell = [string, "hot" | "open" | null] | null;
  const rows: { name: string; role: string; color: string; shifts: Cell[] }[] = [
    { name: "Jordan Beaulieu",  role: "Server",    color: "#6aa2ff", shifts: [["4p-11p", null], ["4p-11p", null], null, ["11a-4p", null], ["6p-2a", "hot"], ["6p-2a", null], null] },
    { name: "Aisha Sow",        role: "Bartender", color: "#4ee0c5", shifts: [null, ["6p-2a", null], ["6p-2a", null], null, ["6p-2a", "hot"], ["6p-2a", null], ["4p-11p", null]] },
    { name: "Marc-Antoine R.",  role: "Line cook", color: "#f5b544", shifts: [["11a-4p", null], null, ["11a-4p", null], ["4p-11p", null], ["4p-11p", null], ["4p-11p", null], null] },
    { name: "Liam Doucet",      role: "Server",    color: "#f17a8e", shifts: [null, ["4p-11p", null], ["4p-11p", null], ["4p-11p", null], null, ["11a-4p", "open"], ["11a-4p", null]] },
    { name: "Sarah Tremblay",   role: "Manager",   color: "#a78bff", shifts: [["9a-5p", null], ["9a-5p", null], ["9a-5p", null], ["1p-9p", null], ["1p-9p", null], ["1p-9p", null], ["9a-5p", null]] },
    { name: "Léa Beaulieu",     role: "Host",      color: "#8db9ff", shifts: [["5p-11p", null], ["5p-11p", null], null, ["5p-11p", null], ["5p-11p", null], ["5p-11p", null], null] },
  ];
  return (
    <div className="p-4 overflow-x-auto">
      <div className="grid gap-1.5 text-[11px]" style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}>
        <div />
        {days.map((d, i) => (
          <div key={d} className="px-2 py-1.5 font-medium">
            <div className="text-ink-500">{d}</div>
            <div className={`text-[9px] mt-0.5 ${i === 4 || i === 5 ? "text-warn" : "text-ink-600"}`}>
              {i === 4 || i === 5 ? "high demand" : "normal"}
            </div>
          </div>
        ))}
        {rows.map(r => (
          <div key={r.name} className="contents">
            <div className="px-2 py-2 flex items-center gap-2">
              <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] text-white font-semibold"
                style={{ background: `linear-gradient(135deg, ${r.color}, color-mix(in srgb, ${r.color} 40%, #000))` }}>
                {r.name.split(" ").map(p => p[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-ink-50 truncate">{r.name}</div>
                <div className="text-[10px] text-ink-500">{r.role}</div>
              </div>
            </div>
            {r.shifts.map((s, si) => <ShiftCell key={si} cell={s} color={r.color} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShiftCell({ cell, color }: { cell: [string, "hot" | "open" | null] | null; color: string }) {
  if (!cell) return <div className="h-[38px] rounded-md bg-white/[0.015] border border-dashed border-white/[0.06]" />;
  const [time, flag] = cell;
  const isHot = flag === "hot";
  const isOpen = flag === "open";
  return (
    <div className="h-[38px] rounded-md px-2 py-1 flex flex-col justify-center overflow-hidden border"
      style={{
        background: isOpen ? "rgba(245,181,68,0.12)" : `color-mix(in srgb, ${color} 14%, transparent)`,
        borderColor: isOpen ? "rgba(245,181,68,0.45)" : isHot ? "rgba(241,122,142,0.45)" : `color-mix(in srgb, ${color} 35%, transparent)`,
      }}>
      <div className={`text-[11px] ${isOpen ? "text-warn" : "text-ink-50"}`}>{isOpen ? "Open shift" : time}</div>
      <div className="text-[9px] text-ink-500">{isHot ? "+$3 hot" : isOpen ? "2 offers sent" : ""}</div>
    </div>
  );
}

function CopilotBubble() {
  const text = "schedule Jordan and Aisha at yoko luna for Saturday 6pm-2am";
  const [chars, setChars] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setChars(c => c < text.length ? c + 1 : c), 50);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden md:block absolute bottom-6 right-6 w-[340px] z-20 animate-float rounded-md border border-white/20 backdrop-blur-xl p-4 shadow-glow"
      style={{ background: "rgba(13,20,34,0.92)" }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Bolt size={14} />
        <span className="text-xs font-semibold">Co-pilot</span>
        <kbd className="kbd ml-auto">⌘K</kbd>
      </div>
      <div className="bg-black/40 border border-white/[0.06] rounded-md px-3 py-2.5 font-mono text-[12.5px] text-ink-50 min-h-[36px]">
        <span className="text-brand-500">›</span> {text.slice(0, chars)}
        <span className="animate-blink">▍</span>
      </div>
      <div className="mt-2.5 text-[11px] text-ink-500 flex justify-between">
        <span>Powered by Claude · 24ms</span>
        <span className="text-success">● 2 shifts ready to confirm</span>
      </div>
    </div>
  );
}

/* ============================================================================
   TRUST MARQUEE
   ============================================================================ */
function TrustMarquee() {
  const logos = [
    { mono: "YL", name: "Yoko Luna",             desc: "Restaurant · Mile End",      tone: "#6aa2ff" },
    { mono: "PS", name: "Platinum Security",     desc: "Security · 24 sites",        tone: "#a78bff" },
    { mono: "SP", name: "Supermarché PA",        desc: "Grocery · 12 locations",     tone: "#4ee0c5" },
    { mono: "PA", name: "PANGEA 9487 inc",       desc: "Field service · Montréal",   tone: "#f5b544" },
    { mono: "BG", name: "Boulangerie Guillaume", desc: "Hospitality · Quebec City",  tone: "#f17a8e" },
    { mono: "SS", name: "Studio Sphere Fitness", desc: "Fitness · 3 studios",        tone: "#8db9ff" },
    { mono: "MC", name: "Mile End Clinic",       desc: "Healthcare · 18 clinicians", tone: "#4ee0c5" },
    { mono: "CR", name: "Clover Retail Group",   desc: "Retail · 8 stores",          tone: "#a78bff" },
  ];
  const doubled = [...logos, ...logos];
  return (
    <section className="py-16 border-y border-white/[0.06] bg-ink-950">
      <div className="container text-center mb-8">
        <div className="text-[12px] font-mono uppercase tracking-[0.16em] text-ink-500">
          Trusted by teams of every shape and size
        </div>
      </div>
      <div className="marquee">
        <div className="marquee-track">
          {doubled.map((l, i) => (
            <div key={i} className="flex items-center gap-3 opacity-65">
              <div className="w-7 h-7 rounded-md text-[10px] font-bold text-white flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${l.tone}, color-mix(in srgb, ${l.tone} 40%, #000))` }}>
                {l.mono}
              </div>
              <div className="text-[13px] whitespace-nowrap">
                <span className="text-ink-50">{l.name}</span>
                <span className="text-ink-500"> · {l.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   METRICS STRIP
   ============================================================================ */
function MetricsStrip() {
  return (
    <section className="py-20 border-b border-white/[0.06]">
      <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
        <Metric value={50}   suffix="%"   label="Fewer no-shows"   sub="across the marketplace" />
        <Metric value={12}   suffix="+ hrs" label="Saved per manager" sub="every week" />
        <Metric value={5}                 suffix=" min" label="Setup time"      sub="with industry templates" />
        <Metric value={99.9} suffix="%"   decimals={1} label="Uptime SLA"   sub="Pro & Business plans" />
      </div>
    </section>
  );
}

function Metric({ value, label, sub, suffix = "", decimals = 0 }: { value: number; label: string; sub: string; suffix?: string; decimals?: number }) {
  return (
    <div>
      <div className="font-display text-[56px] font-medium leading-none grad-text-accent tabular-nums">
        <Counter to={value} suffix={suffix} decimals={decimals} />
      </div>
      <div className="mt-3 text-[15px] text-ink-50">{label}</div>
      <div className="text-[13px] text-ink-500">{sub}</div>
    </div>
  );
}

/* ============================================================================
   FEATURES BENTO
   ============================================================================ */
function FeaturesBento() {
  return (
    <section id="features" className="section-pad relative">
      <div className="container">
        <Reveal>
          <div className="text-center mb-16">
            <div className="eyebrow mb-4"><Bolt size={14} /> A workforce OS, not a spreadsheet</div>
            <h2 className="h-section-display max-w-[900px] mx-auto">
              <span className="grad-text">Everything you need.</span><br />
              <span className="grad-text-accent font-normal">Nothing you don&apos;t.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[280px]">
          <Reveal className="md:col-span-4 md:row-span-2 h-full">
            <BentoTile big>
              <BentoHead title="AI Co-pilot" desc="Cmd+K, ask anything. From scheduling to reports — natural language interface for every operator task." />
              <div className="mt-6 flex-1">
                <CopilotMockMini />
              </div>
            </BentoTile>
          </Reveal>

          <Reveal delay={100} className="md:col-span-2 h-full">
            <BentoTile>
              <BentoHead title="Auto-Scheduler" desc="One click generates a balanced, compliant week." sm />
              <div className="mt-4 grid grid-cols-7 gap-0.5 flex-1">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="rounded-sm"
                    style={{
                      background: i % 5 === 0 ? "rgba(106,162,255,0.5)"
                        : i % 3 === 0 ? "rgba(78,224,197,0.4)"
                        : i % 7 === 0 ? "rgba(245,181,68,0.4)"
                        : "rgba(255,255,255,0.06)",
                    }} />
                ))}
              </div>
              <div className="mt-3 text-[11px] text-ink-500">Generated · 1.8s · ✓ 42 shifts · 0 conflicts</div>
            </BentoTile>
          </Reveal>

          <Reveal delay={200} className="md:col-span-2 h-full">
            <BentoTile>
              <BentoHead title="Compliance Autopilot" desc="6 rule families enforced live before shifts publish." sm />
              <ul className="mt-3 space-y-1.5 flex-1 text-[12px]">
                {[
                  { l: "Weekly OT cap",         warn: false },
                  { l: "Min rest gap",          warn: false },
                  { l: "Predictive scheduling", warn: true  },
                  { l: "Meal break required",   warn: false },
                  { l: "Minor labor hours",     warn: false },
                ].map(r => (
                  <li key={r.l} className="flex items-center gap-2">
                    <span className={`text-sm ${r.warn ? "text-warn" : "text-success"}`}>{r.warn ? "⚠" : "✓"}</span>
                    <span className="text-ink-300">{r.l}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-[11px] text-ink-500">1 auto-resolved · 0 violations published</div>
            </BentoTile>
          </Reveal>

          <Reveal delay={300} className="md:col-span-3 h-full">
            <BentoTile>
              <BentoHead title="Open-Shift Marketplace" desc="First-respond-wins claims, no group texts." sm />
              <div className="mt-3 space-y-2 flex-1 text-[12px]">
                {[
                  { name: "Aisha S.",         state: "✓ Claimed",     tone: "success" },
                  { name: "Jordan B.",        state: "Offered · 2m",  tone: "info"    },
                  { name: "Marc-Antoine R.",  state: "Wave 2",        tone: "warn"    },
                ].map(o => (
                  <div key={o.name} className="flex items-center gap-2.5 p-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
                    <div className="w-6 h-6 rounded-full bg-brand-500/40 text-[9px] flex items-center justify-center text-ink-50 font-semibold">
                      {o.name.split(" ").map(p => p[0]).join("")}
                    </div>
                    <div className="flex-1 text-ink-50">{o.name}</div>
                    <span className={`status status-${o.tone}`}>{o.state}</span>
                  </div>
                ))}
              </div>
            </BentoTile>
          </Reveal>

          <Reveal delay={400} className="md:col-span-3 h-full">
            <BentoTile>
              <BentoHead title="Geofenced clock-in" desc="GPS + selfie verification. No buddy punching." sm />
              <div className="mt-3 flex-1 relative rounded-md bg-gradient-to-br from-brand-900/40 to-cyan-900/20 border border-white/[0.06] overflow-hidden">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-brand-500/60 animate-pulse-ring"
                  style={{ boxShadow: "0 0 40px rgba(106,162,255,0.4)" }} />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-brand-500/30" />
                <div className="absolute bottom-3 right-3 p-2 rounded-md bg-ink-950/80 backdrop-blur border border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-300 to-brand-700" />
                    <div className="text-[11px]">
                      <div className="text-ink-50">Jordan B.</div>
                      <div className="text-success">✓ Verified · 9:02a</div>
                    </div>
                  </div>
                </div>
              </div>
            </BentoTile>
          </Reveal>

          <Reveal delay={500} className="md:col-span-6 h-full">
            <BentoTile>
              <BentoHead title="Real-time analytics" desc="Labor cost, OT, attendance — updated as your team clocks in." sm />
              <div className="mt-3 grid grid-cols-3 gap-4 flex-1">
                <div className="col-span-2 relative rounded-md bg-white/[0.02] border border-white/[0.04] p-3">
                  <div className="text-[10px] text-ink-500 uppercase tracking-wider">Labor cost · this week</div>
                  <svg className="w-full h-32 mt-1" viewBox="0 0 280 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6aa2ff" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#6aa2ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,60 Q40,40 70,55 T140,42 T200,30 T280,50 L280,100 L0,100 Z" fill="url(#lineGrad)" />
                    <path d="M0,60 Q40,40 70,55 T140,42 T200,30 T280,50" stroke="#6aa2ff" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <div className="rounded-md bg-white/[0.02] border border-white/[0.04] p-3">
                  <div className="text-[10px] text-ink-500 uppercase tracking-wider">OT hours</div>
                  <div className="mt-2 space-y-1.5">
                    {[80, 50, 30, 20].map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="text-[10px] text-ink-500 w-6">D{i + 1}</div>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                          <div className="h-full rounded-full bg-warn" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BentoTile>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function BentoTile({ children, big = false }: { children: ReactNode; big?: boolean }) {
  return (
    <div className={`glow-card h-full p-6 flex flex-col ${big ? "card-pop" : ""}`}>
      {children}
    </div>
  );
}

function BentoHead({ title, desc, sm = false }: { title: string; desc: string; sm?: boolean }) {
  return (
    <>
      <h3 className={`${sm ? "text-[15px]" : "text-[22px]"} font-semibold text-ink-50`}>{title}</h3>
      <p className={`mt-1.5 ${sm ? "text-[13px]" : "text-[14px]"} text-ink-300 leading-snug`}>{desc}</p>
    </>
  );
}

function CopilotMockMini() {
  const samples = [
    { q: "find a replacement for Liam's Friday night shift",                a: "3 candidates ranked. Aisha is your best bet — she's worked 24h this week, lives nearby, and her availability matches." },
    { q: "schedule Jordan and Aisha at yoko luna for Saturday 6pm-2am",     a: "✓ 2 shifts created at Mile End for Saturday May 24. Both are within OT limits." },
    { q: "who's worked the most overtime this period?",                      a: "Marc-Antoine has 6.2h OT, Sarah 4.8h, Jordan 3.1h. Want me to draft a flatten-OT week-2?" },
    { q: "approve all pending time-off requests through May 30",             a: "5 requests approved. Coverage auto-resolved for 3 — 2 still need an open-shift offer fired." },
  ];
  const [idx, setIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    setChars(0); setDone(false);
    const target = samples[idx].q.length;
    const typer = setInterval(() => setChars(c => c < target ? c + 1 : c), 35);
    const reveal = setTimeout(() => setDone(true), 35 * target + 400);
    const cycle  = setTimeout(() => setIdx(i => (i + 1) % samples.length), 5200);
    return () => { clearInterval(typer); clearTimeout(reveal); clearTimeout(cycle); };
  }, [idx]);
  return (
    <div className="bg-ink-950/60 border border-white/[0.06] rounded-md p-4 h-full flex flex-col">
      <div className="flex items-center gap-1.5 mb-2">
        <Bolt size={12} />
        <span className="text-[10px] font-mono text-brand-300 uppercase tracking-[0.16em]">claude · 24ms</span>
      </div>
      <div className="font-mono text-[13.5px] mb-3">
        <span className="text-brand-500">›</span> {samples[idx].q.slice(0, chars)}
        {!done && <span className="animate-blink">▍</span>}
      </div>
      {done && (
        <div className="text-[13px] text-ink-300 leading-relaxed animate-fade-in">
          {samples[idx].a}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {["/schedule", "/find-replacement", "/approve all", "/overtime report"].map(s => (
          <span key={s} className="text-[10px] font-mono px-2 py-1 rounded bg-white/[0.04] text-ink-500 border border-white/[0.06]">{s}</span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   INDUSTRIES SWITCHER
   ============================================================================ */
const INDUSTRIES = [
  { key: "restaurant",    emoji: "🍝", label: "Restaurant",   desc: "Tip pools, 8-h shifts, FOH/BOH staffing.", positions: ["Server", "Bartender", "Line cook", "Host", "Expo"], compliance: "Fair Workweek · meal breaks · tip pool reporting" },
  { key: "grocery",       emoji: "🛒", label: "Grocery",      desc: "Departments, peak-coverage, minor-labor rules.", positions: ["Cashier", "Stocker", "Deli", "Bakery", "Produce"], compliance: "FLSA minor labor · weekly OT · meal breaks" },
  { key: "security",      emoji: "🛡", label: "Security",     desc: "Posts, licence tracking, client billing.", positions: ["Unarmed Guard", "Armed Guard", "Patrol", "Console", "Supervisor"], compliance: "Guard licence · agency permit · firearm cert" },
  { key: "retail",        emoji: "🛍", label: "Retail",       desc: "Foot-traffic-driven, VM tasks, loss prevention.", positions: ["Sales", "Cashier", "VM", "Stock", "Manager"], compliance: "Predictive scheduling · break rules" },
  { key: "healthcare",    emoji: "⚕", label: "Healthcare",   desc: "Patient ratios, on-call, license tracking.", positions: ["RN", "LPN", "CNA", "Charge", "Tech"], compliance: "Patient ratios · RN/LPN licence · CEUs" },
  { key: "field_service", emoji: "🔧", label: "Field Service", desc: "Multi-site, GPS clock-in, vehicle assignment.", positions: ["Technician", "Lead", "Driver", "Dispatcher", "Installer"], compliance: "Travel pay · meal break · OT" },
  { key: "office",        emoji: "◳", label: "Office",       desc: "Hot-desk, meeting rooms, hybrid teams.", positions: ["Receptionist", "Admin", "IT", "HR", "Manager"], compliance: "PTO accruals · OT cap" },
  { key: "fitness",       emoji: "◐", label: "Fitness",      desc: "Class roster, PT bookings, instructor cert.", positions: ["Trainer", "Instructor", "Front Desk", "Manager", "Maintenance"], compliance: "Group fitness cert · CPR · liability" },
];

/* ============================================================================
   GEOFENCED CLOCK-IN SHOWCASE — real Leaflet map, advertises GPS + photo proof
   ============================================================================ */
function GeofenceShowcase() {
  // Illustrative sample data (decorative). Shows a site geofence with on-site
  // (green) punches and one off-site (amber) attempt.
  const sites = [{ id: "demo", name: "Downtown Store", lat: 30.2672, lng: -97.7431, radius: 160 }];
  const punches = [
    { lat: 30.2675, lng: -97.7428, inside: true,  label: "Maria · clock in · on-site" },
    { lat: 30.2669, lng: -97.7434, inside: true,  label: "Devon · clock in · on-site" },
    { lat: 30.2705, lng: -97.7472, inside: false, label: "Flagged · 470m away" },
  ];

  return (
    <section id="geofence" className="section-pad relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-brand-300 mb-3">
                <MapPin className="w-3.5 h-3.5" /> Geofenced clock-in
              </div>
              <h2 className="font-display text-[clamp(28px,4vw,42px)] font-medium tracking-tight-2 leading-[1.05]">
                Know it&rsquo;s really them —<br />on-site, on the map.
              </h2>
              <p className="text-ink-300 mt-4 text-[15px] leading-relaxed max-w-md">
                Every punch is pinned to a live map and checked against the site&rsquo;s geofence.
                Off-site attempts are blocked and flagged in amber, so &ldquo;my buddy clocked me
                in&rdquo; stops being a thing.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: MapPin, t: "GPS geofence per site", d: "Punches outside the radius are rejected, not just logged." },
                  { icon: Camera, t: "Photo on every clock-in", d: "A timestamped selfie managers can review at a glance." },
                  { icon: ShieldCheck, t: "Audit trail on the map", d: "See exactly where each shift started — green inside, amber outside." },
                ].map(({ icon: Icon, t, d }) => (
                  <li key={t} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-ink-50">{t}</div>
                      <div className="text-[12.5px] text-ink-400">{d}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-2xl border border-white/[0.08] bg-ink-900/40 p-3 shadow-2xl">
              <GeoMap sites={sites} punches={punches} height={360} interactive={false} />
              <div className="flex items-center justify-between px-2 pt-3 text-[11px] text-ink-400">
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> On-site punch</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Off-site (flagged)</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-400" /> Geofence</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function IndustriesSwitcher() {
  const [active, setActive] = useState(0);
  const v = INDUSTRIES[active];
  return (
    <section id="industries" className="section-pad relative">
      <div className="container">
        <Reveal>
          <div className="text-center mb-12">
            <div className="eyebrow mb-4"><Bolt size={14} /> One platform · 11 industries</div>
            <h2 className="h-section-display max-w-[800px] mx-auto">
              <span className="grad-text">Tuned for the way </span>
              <span className="grad-text-accent font-normal">you work.</span>
            </h2>
          </div>
        </Reveal>

        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {INDUSTRIES.map((ind, i) => (
            <button
              key={ind.key}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] transition-all border ${
                active === i
                  ? "bg-brand-500/12 border-brand-500/40 text-brand-300 shadow-glow"
                  : "bg-white/[0.03] border-white/[0.06] text-ink-300 hover:border-white/20"
              }`}>
              <span className="text-base">{ind.emoji}</span>
              {ind.label}
            </button>
          ))}
        </div>

        <Reveal key={active}>
          <div className="card p-8 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10">
            <div>
              <div className="text-[72px] leading-none">{v.emoji}</div>
              <div className="mt-4 font-display text-[28px] font-semibold">{v.label}</div>
              <p className="mt-2 text-ink-300 text-[14px] leading-relaxed">{v.desc}</p>

              <div className="mt-6">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500 mb-2">Compliance preset</div>
                <div className="text-[12px] text-ink-300 leading-snug">{v.compliance}</div>
              </div>

              <div className="mt-6">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500 mb-2">Default positions</div>
                <div className="flex flex-wrap gap-1.5">
                  {v.positions.map(p => (
                    <span key={p} className="text-[11px] px-2 py-1 rounded-full bg-white/[0.04] text-ink-300 border border-white/[0.06]">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <Link href={`/for/${v.key}`} className="btn-ghost btn-sm mt-6">
                Use {v.label} template <ArrowRight className="w-3.5 h-3.5 arrow" />
              </Link>
            </div>

            <div className="rounded-lg border border-white/[0.06] p-5 bg-ink-950/60 min-h-[300px]">
              <IndustryMock vertical={v.key} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function IndustryMock({ vertical }: { vertical: string }) {
  const presets: Record<string, { title: string; rows: { name: string; sub: string; tone: "success" | "warn" | "info" | "mute" }[] }> = {
    restaurant: { title: "Tonight · Front of House", rows: [
      { name: "Jordan B.",     sub: "Server · 4p-11p · sections 1-3",    tone: "success" },
      { name: "Aisha S.",      sub: "Bar · 6p-2a · ~$320 tips est.",     tone: "info"    },
      { name: "Liam D.",       sub: "Server · 4p-11p · sections 4-6",    tone: "success" },
      { name: "Open shift",    sub: "Host · 5p-11p · 2 offers sent",     tone: "warn"    },
    ]},
    grocery: { title: "Departments · Tuesday", rows: [
      { name: "Produce",    sub: "3 staffed · 1 needed (peak 4p)",  tone: "warn"    },
      { name: "Cashier",    sub: "6 staffed · all lanes open",      tone: "success" },
      { name: "Deli",       sub: "2 staffed · 1 minor labor flag",  tone: "warn"    },
      { name: "Stockers",   sub: "4 staffed · overnight crew set",  tone: "success" },
    ]},
    security: { title: "Posts · Mile End sector", rows: [
      { name: "Post 1 · Yoko Luna",  sub: "Marc-Antoine · licence ✓",  tone: "success" },
      { name: "Post 2 · PA",         sub: "Liam · licence ✓",          tone: "success" },
      { name: "Post 3 · PANGEA",     sub: "Aisha · expires in 28d",    tone: "warn"    },
      { name: "Patrol",              sub: "Sarah · 9p-5a · client A",  tone: "info"    },
    ]},
    healthcare: { title: "Clinic coverage · today", rows: [
      { name: "ICU",        sub: "1 RN : 2 patients · ✓ within ratio", tone: "success" },
      { name: "Med-surg",   sub: "1 RN : 5 patients · ✓",              tone: "success" },
      { name: "ED",         sub: "1 RN short for 8p-12a · finding…",   tone: "warn"    },
      { name: "Step-down",  sub: "On-call: Léa B.",                    tone: "info"    },
    ]},
    field_service: { title: "Today's dispatch", rows: [
      { name: "Truck 1 · Jordan",  sub: "3 jobs · Mile End route · ETA 9a", tone: "success" },
      { name: "Truck 2 · Marc-A.", sub: "2 jobs + 1 emergency · Plateau",    tone: "info"    },
      { name: "Truck 3",           sub: "Maintenance · returns Wed",         tone: "mute"    },
      { name: "On-call",           sub: "Aisha · 6p-6a",                     tone: "warn"    },
    ]},
    retail: { title: "Sales floor · today", rows: [
      { name: "Apparel",   sub: "2 staffed · VM endcap pending", tone: "warn"    },
      { name: "Cashier",   sub: "4 lanes · 1 break rotation due", tone: "success" },
      { name: "Fitting",   sub: "1 staffed · need 1 for 5p",      tone: "warn"    },
      { name: "Stockroom", sub: "Truck 7a · 3 receiving",         tone: "success" },
    ]},
    office: { title: "Today · workspace", rows: [
      { name: "Hot desks",     sub: "8/12 booked · 4 free", tone: "success" },
      { name: "Olympus room",  sub: "9-10a · Sprint",       tone: "info"    },
      { name: "Visitors",      sub: "2 on-site",            tone: "warn"    },
      { name: "Receptionist",  sub: "Léa · 9a-5p",          tone: "success" },
    ]},
    fitness: { title: "Today's classes", rows: [
      { name: "Spin · 6:30a",  sub: "Sarah · 18/24 booked", tone: "success" },
      { name: "Yoga · 9:00a",  sub: "Aisha · 12/20",         tone: "info"    },
      { name: "HIIT · 5:30p",  sub: "Jordan · waitlist",     tone: "success" },
      { name: "PT (1:1)",      sub: "Marc · 4 sessions",     tone: "info"    },
    ]},
  };
  const preset = presets[vertical] ?? presets.restaurant;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold">{preset.title}</h3>
        <span className="status status-success">Live</span>
      </div>
      <div className="space-y-2">
        {preset.rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-500/40 to-brand-700/40 flex items-center justify-center text-[10px] text-ink-50 font-semibold">
              {r.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-ink-50 truncate">{r.name}</div>
              <div className="text-[11px] text-ink-500 truncate">{r.sub}</div>
            </div>
            <span className={`status status-${r.tone}`}>{r.tone}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   DEEP DIVES
   ============================================================================ */
function DeepDives() {
  return (
    <section className="section-pad relative">
      <div className="container space-y-32">
        <DeepDive
          number="01"
          eyebrow="AI Co-pilot"
          title={<><span className="grad-text">Cmd+K, </span><span className="grad-text-accent font-normal">ask anything.</span></>}
          body="Schedule shifts, find replacements, pull reports, send kudos — all from a single text box. Powered by Claude. The Co-pilot has access to your full org context and respects role-based permissions."
          bullets={[
            "\"Who's worked the most overtime this period?\"",
            "\"Find a replacement for Liam's Friday night shift.\"",
            "\"Send Sarah a high five for covering last week.\"",
          ]}
          mock={<DeepDiveCopilotMock />}
        />
        <DeepDive
          number="02"
          eyebrow="Compliance Autopilot"
          title={<><span className="grad-text">Stop violations </span><span className="grad-text-accent font-normal">before they happen.</span></>}
          body="Six rule families enforced live before publish: weekly OT, daily OT, rest gaps, meal breaks, consecutive days, Fair Workweek. Configurable thresholds per org + per jurisdiction."
          bullets={[
            "NYC / Seattle / Oregon predictive scheduling presets",
            "Custom severity per rule (block vs warn)",
            "Immutable audit log on every change",
          ]}
          mock={<DeepDiveComplianceMock />}
          reverse
        />
        <DeepDive
          number="03"
          eyebrow="Open-Shift Marketplace"
          title={<><span className="grad-text">Fill gaps without firing off </span><span className="grad-text-accent font-normal">12 texts.</span></>}
          body={`Click "Auto-offer" → top 3 candidates get DMs → first to claim wins. Race-safe transactional claiming. Broaden in waves if no one bites.`}
          bullets={[
            "Ranked by location · position · hours · availability",
            "Push notifications via PWA",
            "Manager auto-notified on claim",
          ]}
          mock={<DeepDiveMarketplaceMock />}
        />
      </div>
    </section>
  );
}

function DeepDive({ number, eyebrow, title, body, bullets, mock, reverse = false }: { number: string; eyebrow: string; title: ReactNode; body: string; bullets: string[]; mock: ReactNode; reverse?: boolean }) {
  return (
    <Reveal>
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${reverse ? "lg:[&>div:first-child]:order-2" : ""}`}>
        <div>
          <div className="text-[80px] font-display font-medium grad-text-accent leading-none">{number}</div>
          <div className="eyebrow mt-4">{eyebrow}</div>
          <h3 className="font-display text-[42px] font-medium tracking-tight-3 mt-3 leading-[1.05]">{title}</h3>
          <p className="text-[16px] text-ink-300 leading-relaxed mt-5 max-w-[480px]">{body}</p>
          <ul className="mt-6 space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] text-ink-300">
                <Check className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>{mock}</div>
      </div>
    </Reveal>
  );
}

function DeepDiveCopilotMock() {
  return (
    <div className="card-pop p-5 space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500">Chat thread</div>
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-brand-500/15 border border-brand-500/30 rounded-md p-3 text-[13px]">
          Who&apos;s worked the most overtime this period?
        </div>
      </div>
      <div className="flex justify-start gap-2">
        <Bolt size={14} className="mt-1" />
        <div className="max-w-[85%] bg-white/[0.03] border border-white/[0.06] rounded-md p-3 text-[13px] text-ink-300">
          Top 3 over the May 5–18 period:
          <table className="w-full mt-2 text-[12px]">
            <tbody>
              {[
                { n: "Marc-Antoine R.", h: "6.2h", w: "+ 38%" },
                { n: "Sarah T.",        h: "4.8h", w: "+ 24%" },
                { n: "Jordan B.",       h: "3.1h", w: "+ 11%" },
              ].map(r => (
                <tr key={r.n} className="border-t border-white/[0.04]">
                  <td className="py-1.5">{r.n}</td>
                  <td className="text-right text-warn font-mono">{r.h}</td>
                  <td className="text-right text-ink-500 font-mono">{r.w}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-brand-500/15 border border-brand-500/30 rounded-md p-3 text-[13px]">
          Find a replacement for Liam&apos;s Friday night shift.
        </div>
      </div>
      <div className="flex justify-start gap-2">
        <Bolt size={14} className="mt-1" />
        <div className="max-w-[85%] bg-white/[0.03] border border-white/[0.06] rounded-md p-3 text-[13px] text-ink-300">
          3 ranked candidates:
          <div className="mt-2 space-y-1.5">
            {[
              { n: "Aisha S.",  s: 92, r: "Same site · 24h this week" },
              { n: "Jordan B.", s: 78, r: "Off Friday · trained Server" },
              { n: "Léa B.",    s: 64, r: "Available · trained Host" },
            ].map(c => (
              <div key={c.n} className="flex items-center gap-2 text-[12px]">
                <div className="w-6 h-6 rounded-full bg-brand-500/40 text-[9px] flex items-center justify-center font-semibold">
                  {c.n.split(" ").map(p => p[0]).join("")}
                </div>
                <div className="flex-1">
                  <div className="text-ink-50">{c.n}</div>
                  <div className="text-[10px] text-ink-500">{c.r}</div>
                </div>
                <span className="status status-success">{c.s}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary btn-sm flex-1">Send offer to Aisha</button>
            <button className="btn-ghost btn-sm">Broaden wave</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeepDiveComplianceMock() {
  return (
    <div className="card-pop p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500">Pre-publish check</div>
          <div className="text-[15px] font-semibold mt-1">248 shifts evaluated · 1 auto-resolved</div>
        </div>
        <span className="status status-success">Ready</span>
      </div>
      <div className="space-y-2">
        {[
          { l: "Weekly OT cap (40h)",              warn: false },
          { l: "Daily OT cap (8h)",                warn: false },
          { l: "Min rest gap (8h between shifts)", warn: false },
          { l: "Predictive scheduling (14d lead)", warn: true, fix: "Auto-shifted Aisha's Fri 6p → published 13d ago. Predictability pay: $24.50 logged." },
          { l: "Meal break (5h+)",                 warn: false },
          { l: "Consecutive days (6 max)",         warn: false },
        ].map(r => (
          <div key={r.l} className="flex items-start gap-2.5 p-2.5 rounded-md bg-white/[0.02] border border-white/[0.04]">
            <span className={`text-sm mt-0.5 ${r.warn ? "text-warn" : "text-success"}`}>{r.warn ? "⚠" : "✓"}</span>
            <div className="flex-1">
              <div className="text-[13px] text-ink-50">{r.l}</div>
              {r.fix && <div className="text-[11px] text-warn mt-0.5">{r.fix}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-[11px] text-ink-500">audit log generated · 2 sec ago</div>
        <button className="btn-primary btn-sm">Publish week <ArrowRight className="w-3 h-3 arrow" /></button>
      </div>
    </div>
  );
}

function DeepDiveMarketplaceMock() {
  return (
    <div className="card-pop p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500">Open shift · Saturday 6p-2a</div>
          <div className="text-[15px] font-semibold mt-1">Server · Yoko Luna · Mile End</div>
        </div>
        <span className="status status-warn">Wave 1 · 1m left</span>
      </div>
      <div className="space-y-2">
        {[
          { n: "Aisha S.",         t: "✓ Claimed · 47s ago", tone: "success", highlight: true  },
          { n: "Jordan B.",        t: "Viewing now · 0:23",  tone: "info",    highlight: false },
          { n: "Marc-Antoine R.",  t: "Offered · 1m ago",    tone: "warn",    highlight: false },
        ].map(c => (
          <div key={c.n} className={`flex items-center gap-3 p-3 rounded-md border ${
            c.highlight ? "bg-gradient-to-r from-success/15 to-transparent border-success/40" : "bg-white/[0.02] border-white/[0.04]"
          }`}>
            <div className="w-8 h-8 rounded-full bg-brand-500/40 text-[10px] flex items-center justify-center text-ink-50 font-semibold">
              {c.n.split(" ").map(p => p[0]).join("")}
            </div>
            <div className="flex-1">
              <div className="text-[13px] text-ink-50">{c.n}</div>
              <div className="text-[11px] text-ink-500">{c.t}</div>
            </div>
            <span className={`status status-${c.tone}`}>{c.tone}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.04] text-[11px] text-ink-500 flex justify-between">
        <span>Filled in 47 seconds · no managers texted</span>
        <span className="text-success">● Saving Sarah ~12 min</span>
      </div>
    </div>
  );
}

/* ============================================================================
   PRICING
   ============================================================================ */
function Pricing() {
  const [seats, setSeats] = useState(20);
  const proExtraSeats = Math.max(0, seats - 5);
  const proPrice      = 29 + proExtraSeats * 4;
  const bizExtraSeats = Math.max(0, seats - 15);
  const bizPrice      = 79 + bizExtraSeats * 3;
  const whenIWorkPlus = seats * 4;
  const deputyPremium = seats * 4.5;
  const tiers = [
    {
      name: "Free",
      sub: "Pilot it with your core team",
      price: "$0",
      formula: "Up to 5 employees · 1 location",
      cta: "Start free",
      ctaPrimary: false,
      popular: false,
      features: ["Schedule + open shifts", "Mobile app for everyone", "Basic compliance rules", "Up to 5 employees", "1 location", "Community support"],
    },
    {
      name: "Pro",
      sub: "For growing teams",
      price: `$${proPrice}`,
      formula: `$29 base + 5 seats · $4/extra · ${seats} seats`,
      cta: "Start 7-day trial",
      ctaPrimary: true,
      popular: true,
      features: ["Everything in Free", "AI Co-pilot + Auto-Scheduler", "Compliance Autopilot (6 rule families)", "Open-Shift Marketplace", "Geofenced clock-in + selfie", "POS revenue tracking (manual + integrations on the way)", "Up to 25 seats included scaling"],
    },
    {
      name: "Business",
      sub: "Multi-location with custom compliance",
      price: `$${bizPrice}`,
      formula: `$79 base + 15 seats · $3/extra · ${seats} seats`,
      cta: "Start 7-day trial",
      ctaPrimary: false,
      popular: false,
      features: ["Everything in Pro", "Multi-location dashboard", "Custom compliance jurisdictions", "API + webhooks", "Google SSO", "Priority support · 99.9% SLA"],
    },
    {
      name: "Enterprise",
      sub: "For 200+ employees",
      price: "Custom",
      formula: "Volume pricing · dedicated CSM",
      cta: "Contact sales",
      ctaPrimary: false,
      popular: false,
      features: ["Everything in Business", "Custom contract + DPA", "Custom onboarding", "Dedicated CSM", "24/7 support + Slack channel", "Audit logs · BAA · SOC 2 in progress"],
    },
  ];
  return (
    <section id="pricing" className="section-pad relative">
      <div className="container">
        <Reveal>
          <div className="text-center mb-16">
            <div className="eyebrow mb-4"><Bolt size={14} /> Pricing</div>
            <h2 className="h-section-display max-w-[800px] mx-auto">
              <span className="grad-text">Pay for what you </span>
              <span className="grad-text-accent font-normal">actually use.</span>
            </h2>
            <p className="mt-5 text-[16px] text-ink-300 max-w-[560px] mx-auto">
              Base subscription + per-seat. Slide to your team size and we&apos;ll show you the bill.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="card-pop p-7 max-w-[640px] mx-auto mb-12">
            <div className="text-center">
              <div className="text-[12px] font-mono uppercase tracking-[0.16em] text-brand-500">Your team size</div>
              <div className="font-display text-[64px] font-medium grad-text-accent leading-none mt-2 tabular-nums">{seats}</div>
            </div>
            <input
              type="range" min={1} max={100} value={seats}
              onChange={e => setSeats(parseInt(e.target.value))}
              className="w-full mt-5 accent-brand-500"
            />
            <div className="flex justify-between text-[11px] text-ink-500 mt-1 font-mono">
              <span>1</span><span>25</span><span>50</span><span>75</span><span>100+</span>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={150 + i * 50}>
              <div className={`card p-6 h-full flex flex-col relative ${t.popular ? "ring-brand-glow border-brand-500/40" : ""}`}>
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-brand-500 text-white shadow-glow">
                    Most popular
                  </div>
                )}
                <div className="text-[15px] font-semibold">{t.name}</div>
                <div className="text-[12px] text-ink-500 mt-0.5">{t.sub}</div>
                <div className="mt-5 font-display text-[44px] font-medium grad-text-accent leading-none">{t.price}</div>
                <div className="text-[11px] text-ink-500 mt-1 font-mono">{t.formula}</div>
                <Link href="/signup" className={`mt-5 ${t.ctaPrimary ? "btn-primary" : "btn-ghost"}`}>
                  {t.cta} <ArrowRight className="w-3.5 h-3.5 arrow" />
                </Link>
                <div className="my-5 h-px" style={{ borderTop: "1px dashed rgba(255,255,255,0.08)" }} />
                <ul className="space-y-2 text-[13px] text-ink-300 flex-1">
                  {t.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={400}>
          <div className="mt-10 border-t-2 border-dashed border-white/[0.08] pt-6 text-center">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-500 mb-3">At {seats} seats, compare to</div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[14px]">
              <span className="text-ink-500">When I Work Plus <span className="text-ink-300 font-mono">~${whenIWorkPlus.toFixed(0)}/mo</span></span>
              <span className="text-ink-500">Deputy Premium <span className="text-ink-300 font-mono">~${deputyPremium.toFixed(0)}/mo</span></span>
              <span className="text-brand-300 font-semibold">Us (Pro) <span className="font-mono">${proPrice}/mo</span></span>
            </div>
          </div>
        </Reveal>

        {/* Risk-reversal band */}
        <Reveal delay={500}>
          <div className="mt-12 card-pop p-7 md:p-9 max-w-[920px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5 md:gap-7 items-center">
              <div className="shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-success" />
                </div>
              </div>
              <div>
                <div className="font-display text-[22px] md:text-[24px] grad-text leading-tight">No-risk promise.</div>
                <div className="text-[14px] text-ink-300 mt-1.5 leading-relaxed">
                  Try every feature for 7 days, no card required. Stay free forever for teams of 5 or less.
                  Cancel any time from settings — instant, no email-to-cancel nonsense. Full data export on the way out.
                </div>
              </div>
              <div className="shrink-0 md:text-right">
                <Link href="/signup" className="btn-primary">
                  Get started <ArrowRight className="w-4 h-4 arrow" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================================
   CUSTOMERS
   ============================================================================ */
function Customers() {
  const quotes = [
    { quote: "We went from spending 8 hours a week building the schedule to about 4 minutes. The Co-pilot just does it.",
      name: "Sarah Tremblay", role: "Site Manager · Platinum Security", stat: "8h → 4 min schedule build", tone: "#a78bff" },
    { quote: "No-shows are down 52% since we turned on the open-shift marketplace. People claim shifts before we even text.",
      name: "Marc-Antoine Roy", role: "Operations · Supermarché PA", stat: "No-show rate –52%", tone: "#4ee0c5" },
    { quote: "It caught 3 OT violations on a draft schedule before publish. We saved $4,800 in pred-pay we didn't even know we owed.",
      name: "Léa Beaulieu", role: "HR Lead · 9487 Québec inc", stat: "3 OT violations caught", tone: "#8db9ff" },
  ];
  return (
    <section id="customers" className="section-pad relative">
      <div className="container">
        <Reveal>
          <div className="text-center mb-16">
            <div className="eyebrow mb-4"><Bolt size={14} /> Customers</div>
            <h2 className="h-section-display max-w-[800px] mx-auto">
              <span className="grad-text">Built with operators </span>
              <span className="grad-text-accent font-normal">who hated their schedule.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {quotes.map((q, i) => (
            <Reveal key={i} delay={100 + i * 80}>
              <div className="card p-6 lift h-full flex flex-col">
                <div className="text-[48px] leading-none font-display grad-text-accent select-none">&ldquo;</div>
                <p className="text-[15px] text-ink-50 leading-relaxed mt-2 flex-1">{q.quote}</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/[0.06]">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] text-white font-semibold shrink-0"
                    style={{ background: `linear-gradient(135deg, ${q.tone}, color-mix(in srgb, ${q.tone} 40%, #000))` }}>
                    {q.name.split(" ").map(p => p[0]).join("")}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium">{q.name}</div>
                    <div className="text-[11px] text-ink-500">{q.role}</div>
                  </div>
                </div>
                <div className="mt-3 p-3 rounded-md bg-brand-500/8 border border-brand-500/20 text-center">
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500">Result</div>
                  <div className="text-[15px] font-semibold mt-0.5 grad-text-accent">{q.stat}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   FINAL CTA
   ============================================================================ */
function FinalCTA() {
  return (
    <section className="section-pad relative">
      <div className="absolute inset-0 mesh-glow pointer-events-none -z-0" />
      <div className="container relative">
        <Reveal>
          <div className="text-center max-w-[800px] mx-auto">
            <Bolt size={56} className="mx-auto" />
            <h2 className="h-section-display mt-6">
              <span className="grad-text">Stop running your team on </span>
              <span className="grad-text-accent font-normal">Excel + WhatsApp.</span>
            </h2>
            <p className="mt-6 text-[18px] text-ink-300 max-w-[560px] mx-auto">
              Set up in 5 minutes. Schedule your first week with one click. Cancel anytime.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <Link href="/signup" className="btn-primary">
                Start 7-day free trial <ArrowRight className="w-4 h-4 arrow" />
              </Link>
              <a href="#features" className="btn-ghost">Talk to a human</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================================
   COMPARISON TABLE — "how we stack up" matrix vs the named competitors
   ============================================================================ */
function ComparisonTable() {
  const cols = [
    { key: "us",        label: "shyftforce", brand: true,  price: "$29 base + $4/seat" },
    { key: "sling",     label: "Sling",      brand: false, price: "$4/seat" },
    { key: "wiw",       label: "When I Work", brand: false, price: "~$4/seat" },
    { key: "deputy",    label: "Deputy",     brand: false, price: "~$4.5/seat" },
  ];
  type Cell = "yes" | "partial" | "no" | string;
  const rows: { feature: string; sub?: string; values: Record<string, Cell> }[] = [
    { feature: "Schedule + clock-in",       values: { us: "yes", sling: "yes",     wiw: "yes",  deputy: "yes" } },
    { feature: "AI-generated schedules",    sub: "Type intent, get a week.",
      values: { us: "yes", sling: "no",      wiw: "no",   deputy: "partial" } },
    { feature: "Open-shift marketplace",    sub: "First-respond-wins auto-offers.",
      values: { us: "yes", sling: "partial", wiw: "partial", deputy: "partial" } },
    { feature: "Geofenced clock-in + selfie", sub: "GPS + face verification, no buddy punching.",
      values: { us: "yes", sling: "partial", wiw: "yes",  deputy: "yes" } },
    { feature: "Real-time compliance engine", sub: "6 rule families, jurisdiction presets.",
      values: { us: "yes", sling: "no",      wiw: "no",   deputy: "partial" } },
    { feature: "Predictability pay (Fair Workweek)",
      values: { us: "yes", sling: "no",      wiw: "no",   deputy: "no" } },
    { feature: "AI-assisted help (in-app)",  sub: "Ask in plain English, get answers + actions.",
      values: { us: "yes", sling: "no",      wiw: "no",   deputy: "no" } },
    { feature: "Free tier",                  values: { us: "Up to 5", sling: "no", wiw: "no", deputy: "no" } },
    { feature: "Credit card to start trial", values: { us: "no", sling: "yes", wiw: "yes", deputy: "yes" } },
    { feature: "Industry templates that pre-fill 80%",
      values: { us: "yes", sling: "partial", wiw: "no", deputy: "partial" } },
  ];

  function Cell({ v }: { v: Cell }) {
    if (v === "yes") return <Check className="w-4 h-4 text-success mx-auto" />;
    if (v === "no")  return <X className="w-4 h-4 text-ink-600 mx-auto" />;
    if (v === "partial") return <Minus className="w-4 h-4 text-warn mx-auto" />;
    return <span className="text-[12px] text-ink-300">{v}</span>;
  }

  return (
    <section id="compare" className="section-pad relative">
      <div className="container">
        <Reveal>
          <div className="text-center mb-12">
            <div className="eyebrow mb-4"><Bolt size={14} /> How we compare</div>
            <h2 className="h-section-display max-w-[800px] mx-auto">
              <span className="grad-text">Why teams switch </span>
              <span className="grad-text-accent font-normal">from the old guard.</span>
            </h2>
            <p className="mt-5 text-[15px] text-ink-400 max-w-[560px] mx-auto">
              Side-by-side honest comparison. Pricing is per-seat at 20 employees, monthly.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="card-pop overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left px-5 py-4 text-[12px] font-mono uppercase tracking-wider text-ink-500">Feature</th>
                  {cols.map(c => (
                    <th key={c.key} className={`px-3 py-4 ${c.brand ? "bg-brand-500/[0.06]" : ""}`}>
                      <div className={`text-[14px] font-semibold ${c.brand ? "grad-text-accent" : "text-ink-300"}`}>{c.label}</div>
                      <div className="text-[11px] text-ink-500 font-mono mt-0.5">{c.price}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3">
                      <div className="text-[13px] text-ink-200">{r.feature}</div>
                      {r.sub && <div className="text-[11px] text-ink-500 mt-0.5">{r.sub}</div>}
                    </td>
                    {cols.map(c => (
                      <td key={c.key} className={`px-3 py-3 text-center ${c.brand ? "bg-brand-500/[0.04]" : ""}`}>
                        <Cell v={r.values[c.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-6 text-center text-[12px] text-ink-500">
            Last updated June 2026 from public pricing pages. Competitor names are trademarks of their respective owners.
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================================
   FAQ — objection handling, accordion style
   ============================================================================ */
function FAQ() {
  const items: { q: string; a: string }[] = [
    {
      q: "How long does setup actually take?",
      a: "Most managers are productive in under 10 minutes. Pick your industry on signup → we pre-fill positions, shift templates, default compliance rules, sample shifts, and PTO categories. Add one location and invite your team → you're scheduling. The AI Co-pilot can do even more for you in plain English.",
    },
    {
      q: "Do I need a credit card to try?",
      a: "Nope. The 7-day Business trial unlocks everything, no card required. After that you can stay on the Free plan (up to 5 employees + 1 location) forever — or upgrade.",
    },
    {
      q: "What if I just have a few employees? Is this overkill?",
      a: "The Free plan covers up to 5 employees and 1 location, and you get the AI Co-pilot, mobile app, basic compliance, and the open-shift marketplace. Most 3-5 person teams stay free forever. The paid plans add multi-location, the full compliance engine, and the open-shift auto-offer engine.",
    },
    {
      q: "Can I import my existing team and schedule?",
      a: "Yes. CSV import for members, shifts, and locations — drop a spreadsheet, we map the columns, you confirm. Coming from Sling / When I Work / Deputy? Export from there, import here. Or hand the assistant your CSV and it does it for you.",
    },
    {
      q: "Does it work for my industry?",
      a: "Likely yes. Templates ship for restaurants, retail, grocery, security, healthcare, field service, office, fitness, construction, hospitality, and education. Each one configures the right positions, shift blocks, and compliance presets for your vertical. Generic workforce works too if your industry isn't listed.",
    },
    {
      q: "How does the geofenced clock-in actually work?",
      a: "When someone taps Clock In, their phone shares GPS. We measure their distance from the location's address and only allow the punch if they're inside the radius you set. Add face verification on top to stop buddy-punching entirely. No paid maps service — works offline-friendly.",
    },
    {
      q: "Is my team's data secure?",
      a: "Yes. Encrypted in transit + at rest. 2FA optional per workspace (with a force-enroll toggle for the whole org). GDPR + CCPA + PIPEDA right-to-portability built in — your data is yours, full export available anytime. SOC 2 is on the roadmap for Business+ accounts.",
    },
    {
      q: "What happens to my data if I cancel?",
      a: "Full JSON export available from /settings/security. After cancellation we retain data for 30 days in case you change your mind, then delete. Wage and timesheet records are retained where labor law requires (typically 3-7 years depending on jurisdiction).",
    },
    {
      q: "Do you handle Fair Workweek / predictability pay?",
      a: "Yes. The compliance engine checks every draft schedule against six rule families (max weekly hours, daily hours, min rest gap, meal breaks, consecutive days, predictive scheduling). NYC, Seattle, Oregon, Chicago, and Philadelphia presets ship out of the box. Custom thresholds per org.",
    },
    {
      q: "Can my team use it on their phones?",
      a: "Yes — it's a PWA. They install once from their phone's browser ('Add to Home Screen') and it works like a native app: push notifications, offline shift view, photo clock-in. iOS 16.4+, Android Chrome, and desktop browsers all supported.",
    },
  ];

  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="section-pad relative">
      <div className="container max-w-[820px]">
        <Reveal>
          <div className="text-center mb-12">
            <div className="eyebrow mb-4"><Bolt size={14} /> FAQ</div>
            <h2 className="h-section-display">
              <span className="grad-text">The questions everyone asks </span>
              <span className="grad-text-accent font-normal">before signing up.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="space-y-2">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="card overflow-hidden">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02] transition"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-[15px] text-ink-50">{item.q}</span>
                    <span className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center border border-white/[0.08] transition ${
                      isOpen ? "bg-brand-500/15 text-brand-300 border-brand-500/30 rotate-45" : "text-ink-400"
                    }`}>
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-[14px] text-ink-300 leading-relaxed border-t border-white/[0.04] pt-3 animate-fade-in">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="text-center mt-10 text-[14px] text-ink-400">
            Still have a question? <a href="mailto:hi@shyftforce.com" className="text-brand-300 underline hover:text-brand-200">Email us</a> — we read every one.
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================================
   MOBILE STICKY CTA — pinned bar on mobile so the primary action is always
   visible during scroll. Auto-hides above sm:.
   ============================================================================ */
function MobileStickyCTA() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    function onScroll() {
      // Only appear after the user has scrolled past the hero
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`sm:hidden fixed bottom-0 inset-x-0 z-50 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-ink-950/95 backdrop-blur-xl border-t border-white/[0.08] px-4 py-3 flex items-center gap-2 shadow-2xl">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-ink-50 truncate">Start free — no card</div>
          <div className="text-[10px] text-ink-500 truncate">5-min setup · cancel anytime</div>
        </div>
        <Link href="/signup" className="btn-primary btn-sm shrink-0">
          Get started <ArrowRight className="w-3 h-3 arrow" />
        </Link>
      </div>
    </div>
  );
}

/* ============================================================================
   FOOTER
   ============================================================================ */
function MarketingFooter() {
  /**
   * Only links that go somewhere real. Anchors point at on-page sections;
   * /legal/* exist as pages; mailto is a working contact. Stripping the
   * filler ("Changelog / Careers / Blog / SOC 2 / Twitter") that previously
   * sat as dead `href="#"` links — those are credibility killers on a
   * landing page where a prospect is still deciding to trust us.
   */
  const cols = [
    { title: "Product", links: [
      { label: "Features",        href: "#features" },
      { label: "How it compares", href: "#compare" },
      { label: "Pricing",         href: "#pricing" },
      { label: "FAQ",             href: "#faq" },
    ]},
    { title: "Resources", links: [
      { label: "Help center",         href: "/help" },
      { label: "Changelog",           href: "/changelog" },
      { label: "Industries we serve", href: "#industries" },
      { label: "Customer stories",    href: "#customers" },
    ]},
    { title: "Legal", links: [
      { label: "Terms of service",   href: "/legal/terms" },
      { label: "Privacy policy",     href: "/legal/privacy" },
      { label: "Data processing",    href: "/legal/dpa" },
    ]},
    { title: "Contact", links: [
      { label: "support@shyftforce.com", href: "mailto:support@shyftforce.com" },
      { label: "Sales inquiries",        href: "mailto:sales@shyftforce.com" },
    ]},
  ];
  return (
    <footer className="border-t border-white/[0.06] pt-20 pb-10">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Bolt size={24} />
              <Wordmark className="text-[20px]" />
            </div>
            <p className="text-[14px] text-ink-300 leading-relaxed max-w-sm">
              The workforce platform that runs itself. AI-first scheduling, compliance, and open-shift marketplace for modern teams.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="status status-success">All systems operational</span>
            </div>
            <div className="mt-3 text-[12px] text-ink-500">SOC 2 in progress · GDPR-ready · BAA available</div>
          </div>
          {cols.map(c => (
            <div key={c.title}>
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-500 mb-3">{c.title}</div>
              <ul className="space-y-2">
                {c.links.map(l => (
                  <li key={l.href}>
                    <a href={l.href} className="text-[13px] text-ink-300 hover:text-ink-50 transition">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-ink-500">
          <div>© {new Date().getFullYear()} ShyftForce. All rights reserved.</div>
          <div>Made with <Bolt size={12} className="inline-block align-middle mx-0.5" /> in Montréal &amp; San Francisco</div>
        </div>
      </div>
    </footer>
  );
}
