"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Calendar, Clock, Moon, MoreHorizontal } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

/**
 * Mobile bottom navigation — the primary way phone users move around the app.
 * Hidden on lg+ (the sidebar takes over there). Five universal tabs that work
 * for every industry and role: Home · Schedule · Clock · Time Off · More.
 * Without this, mobile users had no nav at all except the hidden ⌘K palette.
 */
const TABS = [
  { href: "/dashboard",  icon: Home,           key: "nav.dashboard", fallback: "Home" },
  { href: "/schedule",   icon: Calendar,       key: "nav.schedule",  fallback: "Schedule" },
  { href: "/attendance", icon: Clock,          key: "nav.attendance",fallback: "Clock" },
  { href: "/time-off",   icon: Moon,           key: "nav.time_off",  fallback: "Time Off" },
  { href: "/more",       icon: MoreHorizontal, key: "nav.more",      fallback: "More" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-ink-950/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {TABS.map(({ href, icon: Icon, key, fallback }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-brand-300" : "text-ink-400 hover:text-ink-100",
              )}
            >
              <Icon className={cn("w-[18px] h-[18px]", active ? "text-brand-300" : "text-ink-400")} />
              <span className="leading-none truncate max-w-full px-1">{t(key) || fallback}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
