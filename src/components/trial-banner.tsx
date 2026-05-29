"use client";
import Link from "next/link";
import { useState } from "react";
import { Sparkles, X, AlertTriangle, Clock } from "lucide-react";

/**
 * Trial countdown banner. Three tiers so the urgency rises gracefully instead
 * of slamming users with the expired-gate out of nowhere:
 *   • 4+ days  → calm brand gradient, dismissable for the session
 *   • 2-3 days → amber warning, dismissable
 *   • 1 day    → red urgent — also dismissable but the copy is explicit about
 *                what happens tomorrow
 */
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

  const tier: "calm" | "warn" | "urgent" =
    daysLeft <= 1 ? "urgent" :
    daysLeft <= 3 ? "warn" :
    "calm";

  const bg =
    tier === "urgent" ? "bg-rose-600 text-white" :
    tier === "warn"   ? "bg-amber-500 text-white" :
    "bg-gradient-to-r from-brand-500 to-rose-500 text-white";

  const headline =
    tier === "urgent" && daysLeft === 1 ? `🔥 Last day of your trial`
    : tier === "urgent"                 ? `🔥 Trial ends today`
    : tier === "warn"                   ? `⏳ Trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
    :                                     `✨ You're on the open-beta 7-day trial`;

  const detail =
    tier === "urgent"
      ? `After it ends, your team won't be able to schedule, clock in, or get paid. Add a card now to keep running.`
    : tier === "warn"
      ? `Add a card any time before then — no charge during the trial, and you keep every feature.`
      : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left of unlimited Business-tier access — no credit card needed.`;

  const Icon = tier === "urgent" ? AlertTriangle : tier === "warn" ? Clock : Sparkles;

  return (
    <div className={`px-4 py-2 text-xs flex items-center justify-between gap-3 flex-wrap ${bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold shrink-0">{headline}</span>
        <span className="text-white/90 truncate">{detail}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/settings/billing"
          className={`whitespace-nowrap font-semibold rounded-md px-2.5 py-1 transition ${
            tier === "calm" ? "underline hover:no-underline" : "bg-white/15 hover:bg-white/25"
          }`}
        >
          {tier === "calm" ? "View plan" : "Add a card →"}
        </Link>
        <button onClick={dismiss} aria-label="Dismiss banner" className="p-1 rounded hover:bg-white/15">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
