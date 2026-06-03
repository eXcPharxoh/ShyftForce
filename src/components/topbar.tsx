"use client";
import { Settings, LogOut, Clock, Sparkles, User as UserIcon, CreditCard, ChevronDown, Shield, Search, Languages } from "lucide-react";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { useLocale, useT } from "@/lib/i18n/provider";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/utils";
import Link from "next/link";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { CmdKPalette } from "@/components/cmdk/cmdk-palette";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { HelpButton } from "@/components/help-button";
import { Bolt } from "@/components/ui/logo";

/**
 * Dashboard top bar — 56px, dark navy, frosted on scroll.
 * Per design_handoff_shyftforce: breadcrumb left · centered ⌘K search · 🔔 right.
 * Cmd+K opens the Co-pilot panel (acts as global search + assistant).
 */
export function Topbar({ name, role, image, showPlatformAdmin = false }: { name: string; role?: string; image?: string | null; showPlatformAdmin?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // ⌘K now opens the palette (jump/search). Palette can escalate to the
  // full Co-pilot chat panel when the user types a free-form question.
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotInitial, setCopilotInitial] = useState<string | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Components elsewhere in the app can stash a pre-filled prompt in
        // sessionStorage and then dispatch a synthetic ⌘K to open the
        // Co-pilot already pointed at the user's intent (e.g. the schedule
        // page's "Draft my week" banner). This is a zero-prop integration —
        // any future caller can opt in just by writing the key.
        const stashed = sessionStorage.getItem("copilot:initialPrompt");
        if (stashed) {
          sessionStorage.removeItem("copilot:initialPrompt");
          setCmdkOpen(false);
          openCopilotWithPrompt(stashed);
          return;
        }
        // If Co-pilot chat is open, ⌘K closes it. Otherwise toggle palette.
        if (copilotOpen) setCopilotOpen(false);
        else setCmdkOpen(v => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copilotOpen]);

  function openCopilotWithPrompt(prompt?: string) {
    setCopilotInitial(prompt);
    setCopilotOpen(true);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <>
      <header className="h-14 sticky top-0 z-30 flex items-center px-6 gap-3 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        {/* ⌘K palette trigger — promoted as the primary entry point.
            Non-technical users can type intent in plain English ("schedule
            Joe for Friday") instead of hunting through menus. The gradient
            sparkle icon + wider footprint signals it's the smart action.
            ⌘K still works globally for keyboard users. */}
        <button
          onClick={() => setCmdkOpen(true)}
          className="group flex-1 max-w-[640px] mx-auto flex items-center gap-3 px-4 h-10 rounded-lg
                     border border-brand-500/25 bg-gradient-to-r from-brand-500/[0.06] to-purple-500/[0.06]
                     hover:from-brand-500/[0.12] hover:to-purple-500/[0.12] hover:border-brand-500/40
                     transition text-left shadow-soft"
        >
          <Sparkles className="w-4 h-4 text-brand-300 shrink-0" />
          <span className="text-[13px] text-ink-200 flex-1 truncate group-hover:text-ink-50 font-medium">
            {t("copilot.ask")}
          </span>
          <kbd className="kbd">⌘K</kbd>
        </button>

        {/* Right cluster */}
        <Link href="/attendance" className="btn-primary btn-sm hidden sm:inline-flex">
          <Clock className="w-3.5 h-3.5" /> {t("action.clock_in").split(" ")[0]}
        </Link>

        <HelpButton />
        <NotificationsBell />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-md hover:bg-white/[0.04] transition"
          >
            {image
              ? <img src={image} alt={name} className="w-7 h-7 rounded-full object-cover ring-1 ring-white/[0.12]" />
              : <span
                  className="w-7 h-7 rounded-full text-white text-[10px] font-semibold flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #a78bff, #3a6fd8)" }}
                >{initials(name)}</span>}
            <div className="text-left hidden md:block">
              <div className="text-[12px] font-medium leading-none text-ink-50">{name}</div>
              <div className="text-[10px] text-ink-500 mt-0.5">{role}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-ink-500 hidden md:block" />
          </button>
          {open && (
            <div className="absolute right-0 top-10 w-60 card p-1.5 z-50 animate-scale-in origin-top-right">
              <div className="px-2.5 py-2.5 border-b border-white/[0.06] mb-1 flex items-center gap-2">
                {image
                  ? <img src={image} alt="" className="w-9 h-9 rounded-md" />
                  : <span
                      className="w-9 h-9 rounded-md text-white text-xs font-semibold flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #a78bff, #3a6fd8)" }}
                    >{initials(name)}</span>}
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate text-ink-50">{name}</div>
                  <div className="text-[11px] text-ink-500">{role}</div>
                </div>
              </div>
              <MenuLink href="/hr/members"       icon={UserIcon}   label="Profile" />
              <MenuLink href="/settings/billing" icon={CreditCard} label="Billing & plan" />
              <MenuLink href="/more"             icon={Settings}   label="Settings" />
              <LanguagePicker />
              {showPlatformAdmin && (
                <>
                  <div className="my-1 mx-1 border-t border-white/[0.06]" />
                  <Link href="/platform" className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-rose-300 hover:bg-rose-500/10 transition font-medium">
                    <Shield className="w-4 h-4" /> Operator console
                  </Link>
                </>
              )}
              <div className="my-1 mx-1 border-t border-white/[0.06]" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-rose-500/10 text-rose-300 transition"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <CmdKPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onOpenCopilot={openCopilotWithPrompt}
      />
      <CopilotPanel
        open={copilotOpen}
        onClose={() => { setCopilotOpen(false); setCopilotInitial(undefined); }}
        initialPrompt={copilotInitial}
      />
    </>
  );
}

function MenuLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-ink-300 hover:bg-white/[0.04] hover:text-ink-50 transition">
      <Icon className="w-4 h-4 text-ink-500" /> {label}
    </Link>
  );
}

function LanguagePicker() {
  const currentLocale = useLocale();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Locale | null>(null);

  async function pick(loc: Locale) {
    if (loc === currentLocale || busy) return;
    setBusy(loc);
    try {
      const res = await fetch("/api/me/locale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: loc }),
      });
      if (res.ok) {
        // Hard reload so server-rendered translations pick up the new locale
        window.location.reload();
      } else {
        setBusy(null);
      }
    } catch {
      setBusy(null);
    }
  }

  return (
    <div className="border-t border-white/[0.06] mt-1 pt-1">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-ink-300 hover:bg-white/[0.04] hover:text-ink-50 transition"
      >
        <Languages className="w-4 h-4 text-ink-500" />
        <span className="flex-1 text-left">Language</span>
        <span className="text-[11px] text-ink-500 font-mono uppercase">{currentLocale}</span>
      </button>
      {open && (
        <div className="px-1 pb-1">
          {LOCALES.map(l => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              disabled={!!busy}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition ${
                l.code === currentLocale
                  ? "bg-brand-500/10 text-brand-300"
                  : "text-ink-300 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span className="flex-1 text-left">{l.label}</span>
              {l.code === currentLocale && <span className="text-success text-[10px]">✓</span>}
              {busy === l.code && <span className="text-ink-500 text-[10px]">…</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
