"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo, Wordmark } from "@/components/ui/logo";
import {
  Home, Calendar, Users, FolderClosed, MessageSquare, Megaphone,
  MoreHorizontal, BarChart3, ShieldCheck, Gift, Sparkles,
} from "lucide-react";
import { primaryNavFor, verticalFor } from "@/lib/verticals/config";

export function Sidebar({ orgName, industry, role, pendingOffers = 0 }: {
  orgName: string;
  industry: string | null;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  pendingOffers?: number;
}) {
  const pathname = usePathname();
  const vertical = verticalFor(industry);
  const primary = primaryNavFor(industry, role);

  // Group: vertical primary, then HR/people, then insights, then More
  const sections: { label?: string; items: { href: string; label: string; icon: any; badge: number | null; highlight?: boolean }[] }[] = [
    {
      label: "Workspace",
      items: primary.map((m) => ({
        href: m.href, label: m.label, icon: m.icon,
        badge: m.href === "/open-shifts" && pendingOffers > 0 ? pendingOffers : null,
        highlight: m.highlight,
      })),
    },
    {
      label: "People",
      items: [
        { href: "/hr",         label: "HR",         icon: Users,        badge: null },
        { href: "/documents",  label: "Documents",  icon: FolderClosed, badge: null },
        { href: "/messenger",  label: "Messenger",  icon: MessageSquare, badge: null },
        { href: "/billboard",  label: "News Feed",  icon: Megaphone,    badge: null },
      ],
    },
    {
      label: "Insights",
      items: [
        { href: "/compliance", label: "Compliance", icon: ShieldCheck,  badge: null },
        { href: "/reports",    label: "Reports",    icon: BarChart3,    badge: null },
      ],
    },
    {
      items: [
        { href: "/more", label: "More", icon: MoreHorizontal, badge: null },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-ink-950 border-r border-ink-200/80 dark:border-ink-800/80 hidden lg:flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <Logo size="md" />
          <div className="min-w-0">
            <Wordmark className="text-base block leading-none" />
            <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-1 truncate max-w-[150px] flex items-center gap-1">
              <span>{vertical.emoji}</span>
              <span className="truncate">{orgName}</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="divider-soft mx-5" />

      <nav className="flex-1 px-3 py-3 overflow-y-auto scroll-thin">
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? "mt-5" : ""}>
            {sec.label && (
              <div className="px-2.5 mb-1.5 text-[10px] uppercase tracking-wider font-bold text-ink-400 dark:text-ink-500">{sec.label}</div>
            )}
            {sec.items.map(({ href, label, icon: Icon, badge, highlight }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium mb-0.5",
                    "transition-all duration-150",
                    active
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : highlight
                        ? "text-ink-900 dark:text-ink-50 hover:bg-brand-50/60 dark:hover:bg-brand-500/10"
                        : "text-ink-700 dark:text-ink-300 hover:bg-ink-100/70 dark:hover:bg-ink-800/70 hover:text-ink-900 dark:hover:text-ink-50",
                  )}
                >
                  <span className={cn("absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all", active ? "bg-brand-500 opacity-100" : "opacity-0")} />
                  <Icon className={cn("w-[17px] h-[17px] shrink-0", active ? "text-brand-600 dark:text-brand-300" : highlight ? "text-rose-500 dark:text-rose-300" : "text-ink-400 dark:text-ink-500")} />
                  <span className="flex-1 truncate">{label}</span>
                  {highlight && !active && <Sparkles className="w-3 h-3 text-rose-500 dark:text-rose-300" />}
                  {badge != null && (
                    <span className={cn("min-w-[20px] text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full", active ? "bg-brand-500 text-white" : "bg-ink-200 text-ink-700 dark:bg-ink-800 dark:text-ink-300")}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Vertical-aware promo card */}
      <div className="p-3">
        <Link
          href={vertical.promoCard.href}
          className="group block p-3.5 rounded-2xl bg-gradient-to-br from-brand-500 to-rose-500 text-white hover:shadow-ring transition relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/15 blur-xl group-hover:bg-white/25 transition" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="text-base">{vertical.promoCard.emoji}</span>
              <div className="text-xs font-bold">{vertical.promoCard.title}</div>
            </div>
            <div className="text-[11px] text-white/85 mt-1 leading-snug">{vertical.promoCard.subtitle}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
