"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home, Calendar, Moon, Clock, CreditCard, Users, FolderClosed,
  MessageSquare, Megaphone, MoreHorizontal, BarChart3, ShieldCheck,
} from "lucide-react";

const NAV = [
  { href: "/dashboard",   label: "Home",       icon: Home,           badge: null },
  { href: "/schedule",    label: "Schedule",   icon: Calendar,       badge: 14 },
  { href: "/time-off",    label: "Time Off",   icon: Moon,           badge: null },
  { href: "/attendance",  label: "Attendance", icon: Clock,          badge: null },
  { href: "/expenses",    label: "Expenses",   icon: CreditCard,     badge: null },
  { href: "/compliance",  label: "Compliance", icon: ShieldCheck,    badge: null },
  { href: "/hr",          label: "HR",         icon: Users,          badge: null },
  { href: "/documents",   label: "Documents",  icon: FolderClosed,   badge: null },
  { href: "/messenger",   label: "Messenger",  icon: MessageSquare,  badge: null },
  { href: "/billboard",   label: "News Feed",  icon: Megaphone,      badge: 7 },
  { href: "/reports",     label: "Reports",    icon: BarChart3,      badge: null },
  { href: "/more",        label: "More",       icon: MoreHorizontal, badge: null },
];

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-ink-200 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-ink-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold">⚡</div>
          <div>
            <div className="font-bold text-sm leading-none">shyftforce</div>
            <div className="text-[11px] text-ink-500 mt-0.5 truncate max-w-[140px]">{orgName}</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto scroll-thin">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-50",
              )}
            >
              <Icon className={cn("w-[18px] h-[18px]", active ? "text-brand-600" : "text-ink-400")} />
              <span className="flex-1">{label}</span>
              {badge != null && (
                <span className={cn(
                  "min-w-[20px] text-center text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
                  active ? "bg-brand-500 text-white" : "bg-ink-200 text-ink-700",
                )}>{badge}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-ink-100">
        <Link href="/billboard" className="block px-3 py-2 rounded-lg text-xs text-ink-500 hover:bg-ink-50">
          🎁 Refer a friend — earn $500
        </Link>
      </div>
    </aside>
  );
}
