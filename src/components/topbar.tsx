"use client";
import { Settings, LogOut, Clock, Sparkles, User as UserIcon, CreditCard, ChevronDown } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/utils";
import Link from "next/link";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { ThemeToggleIcon } from "@/components/ui/theme-toggle";

export function Topbar({ name, role, image }: { name: string; role?: string; image?: string | null }) {
  const [open, setOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Cmd/Ctrl-K toggles Co-pilot
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setCopilotOpen(v => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close user menu on outside click — always-on
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
      <header className="bg-white/80 dark:bg-ink-950/80 backdrop-blur-xl border-b border-ink-200/70 dark:border-ink-800/70 h-16 sticky top-0 z-30 flex items-center px-6 gap-3">
        {/* Co-pilot trigger */}
        <button
          onClick={() => setCopilotOpen(true)}
          className="group flex-1 max-w-2xl flex items-center gap-2.5 px-3.5 h-10 rounded-xl
                     border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 shadow-sm
                     hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 hover:shadow
                     transition text-left"
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-rose-500 text-white
                           flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm text-ink-500 dark:text-ink-400 flex-1 truncate group-hover:text-ink-700 dark:group-hover:text-ink-200">
            <span className="hidden md:inline">Ask Co-pilot anything — </span>schedule, report, message…
          </span>
          <kbd className="kbd hidden md:inline-flex">⌘K</kbd>
        </button>

        {/* Clock CTA */}
        <Link href="/attendance" className="btn-primary h-10 px-4 hidden sm:inline-flex">
          <Clock className="w-4 h-4" /> Clock
        </Link>

        {/* Theme toggle */}
        <ThemeToggleIcon />

        {/* Notifications */}
        <NotificationsBell />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 transition"
          >
            {image
              ? <img src={image} alt={name} className="w-8 h-8 rounded-lg object-cover ring-1 ring-ink-200" />
              : <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-rose-500 text-white text-xs font-bold flex items-center justify-center">{initials(name)}</span>}
            <div className="text-left hidden md:block">
              <div className="text-[12px] font-semibold leading-none text-ink-900 dark:text-ink-50">{name}</div>
              <div className="text-[10px] text-ink-500 dark:text-ink-400 mt-0.5">{role}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-ink-400 hidden md:block" />
          </button>
          {open && (
            <div className="absolute right-0 top-12 w-60 card p-1.5 z-50 animate-scale-in origin-top-right">
              <div className="px-2.5 py-2.5 border-b border-ink-100 dark:border-ink-800 mb-1 flex items-center gap-2">
                {image
                  ? <img src={image} alt="" className="w-9 h-9 rounded-lg" />
                  : <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-rose-500 text-white text-xs font-bold flex items-center justify-center">{initials(name)}</span>}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate text-ink-900 dark:text-ink-50">{name}</div>
                  <div className="text-[11px] text-ink-500 dark:text-ink-400">{role}</div>
                </div>
              </div>
              <MenuLink href="/hr/members"      icon={UserIcon}    label="Profile" />
              <MenuLink href="/settings/billing" icon={CreditCard} label="Billing & plan" />
              <MenuLink href="/more"            icon={Settings}    label="Settings" />
              <div className="my-1 mx-1 border-t border-ink-100 dark:border-ink-800" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </>
  );
}

function MenuLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 transition">
      <Icon className="w-4 h-4 text-ink-500 dark:text-ink-400" /> {label}
    </Link>
  );
}
