"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bolt, Wordmark } from "@/components/ui/logo";
import {
  Users, MessageSquare,
  MoreHorizontal, BarChart3, Settings, ChevronDown, Sparkles, Shield,
} from "lucide-react";
import { primaryNavFor, verticalFor } from "@/lib/verticals/config";
import { useT } from "@/lib/i18n/provider";

/**
 * Dashboard sidebar — 240px wide, dark navy with electric-blue accents.
 * Per design_handoff_shyftforce: org switcher header, 3 nav sections
 * (Workspace / People / Setup), user-row footer with avatar + settings cog.
 */
export function Sidebar({ orgName, industry, role, pendingOffers = 0, userName, userInitials, userRole }: {
  orgName: string;
  industry: string | null;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  pendingOffers?: number;
  userName?: string;
  userInitials?: string;
  userRole?: string;
}) {
  const pathname = usePathname();
  const t = useT();
  const vertical = verticalFor(industry);
  const primary = primaryNavFor(industry, role);

  // Map module hrefs to i18n keys where we have translations; fall back to
  // the config's own label otherwise.
  const NAV_KEY_BY_HREF: Record<string, string> = {
    "/dashboard":   "nav.dashboard",
    "/schedule":    "nav.schedule",
    "/attendance":  "nav.attendance",
    "/open-shifts": "nav.open_shifts",
    "/time-off":    "nav.time_off",
  };
  const tnav = (href: string, fallback: string) => {
    const k = NAV_KEY_BY_HREF[href];
    return k ? t(k) : fallback;
  };

  const isManager = role === "ADMIN" || role === "MANAGER";

  // Progressive disclosure: the sidebar shows the universal core + this
  // vertical's top hero tools (from primaryNavFor), then a slim People and
  // Setup section. Everything else lives one tap away in /more — so a new
  // business sees ~10 focused items, not 17. Employees see even fewer.
  const sections: { label?: string; items: { href: string; label: string; icon: any; badge: number | null; highlight?: boolean; mute?: boolean }[] }[] = [
    {
      label: t("nav.workspace"),
      items: primary.map(m => ({
        href: m.href, label: tnav(m.href, m.label), icon: m.icon,
        badge: m.href === "/open-shifts" && pendingOffers > 0 ? pendingOffers : null,
        highlight: m.highlight,
      })),
    },
    {
      label: t("nav.people"),
      items: [
        { href: "/messenger",  label: t("nav.messenger"),  icon: MessageSquare, badge: null, mute: true },
        // Team management is a manager concern; employees reach their own info
        // from the profile menu, keeping their sidebar minimal.
        ...(isManager ? [{ href: "/hr", label: t("nav.hr"), icon: Users, badge: null }] : []),
      ],
    },
    {
      label: t("nav.setup"),
      items: [
        // Reports + the Admin console are owner/manager tools.
        ...(isManager ? [{ href: "/reports", label: t("nav.reports"), icon: BarChart3, badge: null }] : []),
        ...(role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: Shield, badge: null }] : []),
        // Documents, News Feed, Compliance, billing, integrations, etc. all live
        // in the grouped More directory now — reachable, just not crowding here.
        { href: "/more",       label: t("nav.more"),       icon: MoreHorizontal, badge: null },
      ],
    },
  ];

  return (
    <aside className="w-60 shrink-0 hidden lg:flex flex-col h-screen sticky top-0 border-r border-white/[0.06] bg-ink-950">
      {/* Org switcher header */}
      <div className="px-3 py-4 border-b border-white/[0.06]">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-white/[0.04] transition group"
        >
          <Bolt size={20} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink-50 truncate">{orgName}</div>
            <div className="text-[10.5px] text-ink-500 mt-0.5 flex items-center gap-1">
              <span>{vertical.emoji}</span>
              <span>{vertical.label}</span>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-ink-500" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto scroll-thin">
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? "mt-5" : ""}>
            {sec.label && (
              <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.12em] font-medium text-ink-500">{sec.label}</div>
            )}
            {sec.items.map(({ href, label, icon: Icon, badge, highlight, mute }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium mb-0.5",
                    "transition-all duration-150 border",
                    active
                      ? "bg-brand-500/12 text-brand-300 border-brand-500/25"
                      : "text-ink-300 hover:text-ink-50 hover:bg-white/[0.03] border-transparent",
                  )}
                >
                  <Icon className={cn("w-[15px] h-[15px] shrink-0", active ? "text-brand-300" : "text-ink-500")} />
                  <span className="flex-1 truncate">{label}</span>
                  {highlight && !active && <Sparkles className="w-3 h-3 text-success" />}
                  {badge != null && (
                    <span className={cn(
                      "min-w-[20px] text-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      mute
                        ? "bg-white/[0.04] text-ink-300"
                        : active
                          ? "bg-brand-500 text-white"
                          : "bg-brand-500 text-white",
                    )}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User row footer */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <Link href="/worker/profile" className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-white/[0.04] transition">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #a78bff, #3a6fd8)" }}
          >
            {userInitials ?? "•"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium text-ink-50 truncate">{userName ?? "—"}</div>
            <div className="text-[10.5px] text-ink-500">{userRole ?? role}</div>
          </div>
          <Settings className="w-3.5 h-3.5 text-ink-500" />
        </Link>
      </div>
    </aside>
  );
}

// Backwards-compat re-export of Logo for any imports relying on the old name.
export { Bolt as Logo, Wordmark };
