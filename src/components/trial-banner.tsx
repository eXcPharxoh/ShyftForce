"use client";
import Link from "next/link";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";

// Slim banner at the top of (app)/* during open-beta trial. Dismiss persists
// for the session (sessionStorage) so power users aren't nagged.
export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("sf-trial-banner-dismissed") === "1";
  });
  if (hidden) return null;

  function dismiss() {
    sessionStorage.setItem("sf-trial-banner-dismissed", "1");
    setHidden(true);
  }

  const urgent = daysLeft <= 2;
  return (
    <div className={`px-4 py-2 text-xs flex items-center justify-between gap-3 flex-wrap ${
      urgent
        ? "bg-rose-600 text-white"
        : "bg-gradient-to-r from-brand-500 to-rose-500 text-white"
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold shrink-0">
          {urgent
            ? `🔥 Trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
            : `✨ You're on the open-beta 7-day trial`}
        </span>
        <span className="text-white/85 truncate">
          {daysLeft} day{daysLeft === 1 ? "" : "s"} left of unlimited Business-tier access — no credit card needed.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/settings/billing" className="underline hover:no-underline whitespace-nowrap">View plan</Link>
        <button onClick={dismiss} aria-label="Dismiss banner" className="p-1 rounded hover:bg-white/15">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
