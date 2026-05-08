"use client";
import { Bell, Search, Settings, LogOut, Clock } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { initials } from "@/lib/utils";
import Link from "next/link";

export function Topbar({ name, role, image }: { name: string; role?: string; image?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-white border-b border-ink-200 h-14 sticky top-0 z-30 flex items-center px-6 gap-4">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input className="input pl-9 h-9" placeholder="Search employees, shifts, requests…" />
        </div>
      </div>

      <Link href="/attendance" className="btn-primary h-9 px-4">
        <Clock className="w-4 h-4" /> Clock
      </Link>

      <button className="relative p-2 rounded-lg hover:bg-ink-100">
        <Bell className="w-5 h-5 text-ink-600" />
        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] text-[10px] font-bold bg-brand-500 text-white rounded-full px-1 flex items-center justify-center">75</span>
      </button>

      <div className="relative">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg hover:bg-ink-100">
          {image
            ? <img src={image} alt={name} className="w-7 h-7 rounded-full" />
            : <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-semibold flex items-center justify-center">{initials(name)}</div>}
          <div className="text-left hidden md:block">
            <div className="text-xs font-medium leading-none">{name}</div>
            <div className="text-[10px] text-ink-500 mt-0.5">{role}</div>
          </div>
        </button>
        {open && (
          <div className="absolute right-0 top-11 w-56 card p-1.5 z-50">
            <div className="px-2 py-2 border-b border-ink-100 mb-1">
              <div className="text-sm font-medium">{name}</div>
              <div className="text-[11px] text-ink-500">{role}</div>
            </div>
            <Link href="/hr/members" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-ink-50">
              <Settings className="w-4 h-4" /> Settings
            </Link>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-ink-50 text-rose-600">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
