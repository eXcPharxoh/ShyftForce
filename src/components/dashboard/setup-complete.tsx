"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * One-shot "You're set up!" celebration the first time the dashboard renders
 * AFTER the Getting-Started checklist completes. SessionStorage flag keeps it
 * from re-firing on every page nav. Stays for ~4 seconds, then auto-dismisses.
 */
export function SetupComplete() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("sf-setup-complete-seen")) return;
    setShow(true);
    sessionStorage.setItem("sf-setup-complete-seen", "1");
    const t = setTimeout(() => setShow(false), 4500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  return (
    <div className="card p-5 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-brand-500/10 flex items-center gap-3 animate-fade-up">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
        <Sparkles className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold text-ink-50">You&rsquo;re set up. 🎉</h3>
        <p className="text-[12.5px] text-ink-300">
          Your workspace has a location, your team, and shifts. Try the <b>AI Co-pilot</b> (⌘K) to build next week from rules.
        </p>
      </div>
      <button onClick={() => setShow(false)} className="text-ink-400 hover:text-ink-100 text-[11px]">Dismiss</button>
    </div>
  );
}
