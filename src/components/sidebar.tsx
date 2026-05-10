"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo, Wordmark } from "@/components/ui/logo";
import {
  Home, Calendar, Moon, Clock, CreditCard, Users, FolderClosed,
  MessageSquare, Megaphone, MoreHorizontal, BarChart3, ShieldCheck, ShoppingBag, Gift,
} from "lucide-react";

type Item = { href: string; label: string; icon: any; badge: number | null };
type Section = { label?: string; items: Item[] };

export function Sidebar({ orgName, pendingOffers = 0 }: { orgName: string; pendingOffers?: number }) {
  const pathname = usePathname();

  const sections: Section[] = [
    {
      label: "Workspace",
      items: [
        { href: "/dashboard",    label: "Home",        icon: Home,          badge: null },
        { href: "/schedule",     label: "Schedule",    icon: Calendar,      badge: 14 },
        { href: "/open-shifts",  label: "Open Shifts", icon: ShoppingBag,   badge: pendingOffers > 0 ? pendingOffers : null },
        { href: "/time-off",     label: "Time Off",    icon: Moon,          badge: null },
        { href: "/attendance",   label: "Attendance",  icon: Clock,         badge: null },
        { href: "/expenses",     label: "Expenses",    icon: CreditCard,    badge: null },
      ],
    },
    {
      label: "People",
      items: [
        { href: "/hr",         label: "HR",         icon: Users,        badge: null },
        { href: "/documents",  label: "Documents",  icon: FolderClosed, badge: null },
        { href: "/messenger",  label: "Messenger",  icon: MessageSquare, badge: null },
        { href: "/billboard",  label: "News Feed",  icon: Megaphone,    badge: 7 },
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
        { href: "/more",       label: "More",       icon: MoreHorizontal, badge: null },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-ink-200/80 hidden lg:flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <Logo size="md" />
          <div className="min-w-0">
            <Wordmark className="text-base block leading-none" />
            <div className="text-[11px] text-ink-500 mt-1 truncate max-w-[150px]">{orgName}</div>
          </div>
        </Link>
      </div>

      <div className="divider-soft mx-5" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto scroll-thin">
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? "mt-5" : ""}>
            {sec.label && (
              <div className="px-2.5 mb-1.5 text-[10px] uppercase tracking-wider font-bold text-ink-400">{sec.label}</div>
            )}
            {sec.items.map(({ href, label, icon: Icon, badge }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium mb-0.5",
                    "transition-all duration-150",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-700 hover:bg-ink-100/70 hover:text-ink-900",
                  )}
                >
                  {/* Active rail */}
                  <span
                    className={cn(
                      "absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all",
                      active ? "bg-brand-500 opacity-100" : "opacity-0",
                    )}
                  />
                  <Icon className={cn("w-[17px] h-[17px] shrink-0", active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600")} />
                  <span className="flex-1 truncate">{label}</span>
                  {badge != null && (
                    <span
                      className={cn(
                        "min-w-[20px] text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        active ? "bg-brand-500 text-white" : "bg-ink-200 text-ink-700",
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer card */}
      <div className="p-3">
        <Link
          href="/billboard"
          className="block p-3 rounded-2xl bg-gradient-to-br from-brand-50 to-rose-50 border border-brand-100 hover:shadow-soft transition"
        >
          <div className="flex items-center gap-2 text-brand-700">
            <Gift className="w-4 h-4" />
            <div className="text-xs font-bold">Refer & earn $500</div>
          </div>
          <div className="text-[11px] text-ink-600 mt-1 leading-snug">
            Send a teammate. They sign up. You both win.
          </div>
        </Link>
      </div>
    </aside>
  );
}
