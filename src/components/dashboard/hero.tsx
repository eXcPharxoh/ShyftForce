"use client";
import { useEffect, useState } from "react";
import { Sparkles, Building2, Users } from "lucide-react";
import Link from "next/link";

function greet() {
  const h = new Date().getHours();
  if (h < 5)  return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Working late";
}

export function DashboardHero({
  name, orgName, locationCount, memberCount,
}: { name: string; orgName: string; locationCount: number; memberCount: number }) {
  const [g, setG] = useState("Welcome back");
  useEffect(() => { setG(greet()); }, []);
  const firstName = name.split(" ")[0];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-200/70 dark:border-ink-800/70 bg-white dark:bg-ink-900 p-6 md:p-8 shadow-card dark:shadow-none animate-fade-up">
      {/* Decorative bg */}
      <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-300/20 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-tight-2 text-ink-900 dark:text-ink-50">
            {g}, <span className="text-gradient-brand">{firstName}</span>
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-2">
            Here's what's happening at <span className="font-semibold text-ink-900 dark:text-ink-100">{orgName}</span> today.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ink-100/70 dark:bg-ink-800/70 text-ink-700 dark:text-ink-300">
              <Building2 className="w-3.5 h-3.5" /> {locationCount} location{locationCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ink-100/70 dark:bg-ink-800/70 text-ink-700 dark:text-ink-300">
              <Users className="w-3.5 h-3.5" /> {memberCount} active member{memberCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <Link
          href="/schedule"
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-900 dark:bg-ink-100 text-white dark:text-ink-900 text-sm font-semibold
                     shadow-soft hover:bg-ink-800 dark:hover:bg-white transition self-start"
        >
          <Sparkles className="w-4 h-4 text-brand-300 group-hover:text-brand-200" /> Plan with AI
        </Link>
      </div>
    </div>
  );
}
