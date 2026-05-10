"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, Inbox, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { relTime } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string;
  href: string;
  createdAt: string;
  emoji: string;
  severity: "info" | "warning" | "success";
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Initial poll for count, then refresh every 60s
  useEffect(() => {
    let mounted = true;
    async function refresh() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setItems(data.notifications ?? []);
        setCount(data.unreadCount ?? 0);
        setLoadedOnce(true);
      } catch { /* ignore */ }
    }
    refresh();
    const t = setInterval(refresh, 60000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  // Close on outside click — always-on listener; check ref + state inside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-10 h-10 rounded-xl hover:bg-ink-100 flex items-center justify-center transition"
        aria-label={`Notifications${count ? ` (${count})` : ""}`}
      >
        <Bell className="w-[18px] h-[18px] text-ink-600" />
        {count > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] text-[10px] font-bold
                           bg-brand-500 text-white rounded-full px-1 flex items-center justify-center
                           ring-2 ring-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] card p-0 z-50 animate-scale-in origin-top-right overflow-hidden">
          <header className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-[11px] text-ink-500">{count > 0 ? `${count} item${count === 1 ? "" : "s"} need attention` : "You're all caught up"}</div>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-ink-400" />}
          </header>

          <div className="max-h-[420px] overflow-y-auto scroll-thin">
            {!loadedOnce && (
              <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-ink-400 mx-auto" /></div>
            )}
            {loadedOnce && items.length === 0 && (
              <div className="p-10 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-ink-800">No new notifications</div>
                <div className="text-[11px] text-ink-500 mt-1">We'll let you know when something needs you.</div>
              </div>
            )}
            {loadedOnce && items.length > 0 && (
              <ul className="divide-y divide-ink-100">
                {items.map(n => (
                  <li key={n.id}>
                    <Link
                      href={n.href as any}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-ink-50 transition"
                    >
                      <span className="w-9 h-9 rounded-xl bg-ink-100/80 flex items-center justify-center text-base shrink-0">
                        {n.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-ink-900 truncate">{n.title}</div>
                        {n.body && <div className="text-[11px] text-ink-500 truncate">{n.body}</div>}
                        <div className="text-[10px] text-ink-400 mt-0.5">{relTime(n.createdAt)}</div>
                      </div>
                      <span className={
                        "shrink-0 mt-1 w-1.5 h-1.5 rounded-full " +
                        (n.severity === "warning" ? "bg-amber-500" :
                         n.severity === "success" ? "bg-emerald-500" : "bg-sky-500")
                      } />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="px-4 py-2.5 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between">
            <Link href="/messenger" onClick={() => setOpen(false)} className="text-[11px] text-brand-600 font-semibold hover:underline">Open Messenger</Link>
            <Link href="/settings/audit" onClick={() => setOpen(false)} className="text-[11px] text-ink-500 hover:text-ink-700 inline-flex items-center gap-1">
              <Inbox className="w-3 h-3" /> View audit log
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}
