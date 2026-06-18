"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Copy, Printer, Repeat, Loader2, MoreHorizontal, ShieldAlert, TrendingUp,
} from "lucide-react";
import { useToast } from "@/components/ui/toaster";

export function ScheduleActions({ weekStart }: { weekStart: string }) {
  const r = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function copyWeek() {
    setBusy("copy");
    const res = await fetch("/api/schedule/copy-week", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toWeekStart: weekStart }),
    });
    const data = await res.json();
    setBusy(null); setOpen(false);
    if (!res.ok) { toast.error("Couldn't copy last week", { description: data.error ?? "Try again." }); return; }
    toast.success(`Copied ${data.created} shifts`, {
      description: data.skipped > 0 ? `${data.skipped} skipped due to conflicts.` : undefined,
    });
    r.refresh();
  }

  async function applyRecurring() {
    setBusy("recurring");
    const res = await fetch("/api/schedule/apply-recurring", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart }),
    });
    const data = await res.json();
    setBusy(null); setOpen(false);
    if (!res.ok) { toast.error("Couldn't apply recurring patterns", { description: data.error ?? "Try again." }); return; }
    toast.success(`Created ${data.created} shifts from recurring patterns`, {
      description: data.skipped > 0 ? `${data.skipped} skipped due to conflicts.` : undefined,
    });
    r.refresh();
  }

  function print() {
    setOpen(false);
    window.open(`/schedule/print?w=${weekStart}`, "_blank");
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="btn-outline h-9">
        <MoreHorizontal className="w-4 h-4" /> More
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-64 card p-1.5 animate-scale-in origin-top-right">
            <Action onClick={copyWeek}        icon={Copy}    label="Copy from last week"   busy={busy === "copy"} desc="Duplicate last week's published shifts as drafts" />
            <Action onClick={applyRecurring}  icon={Repeat}  label="Apply recurring patterns" busy={busy === "recurring"} desc="Generate shifts from saved weekly patterns" />
            <Action onClick={print}           icon={Printer} label="Print this week"          desc="Open a print-friendly view in a new tab" />
            <Link href="/schedule/coverage" onClick={() => setOpen(false)} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 mt-0.5 text-rose-500 dark:text-rose-400 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">Coverage Center</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">Live no-show + open-shift autopilot status</div>
              </div>
            </Link>
            <Link href="/schedule/forecast" onClick={() => setOpen(false)} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition flex items-start gap-2.5">
              <TrendingUp className="w-4 h-4 mt-0.5 text-brand-500 dark:text-brand-400 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">Demand Forecast</div>
                <div className="text-[11px] text-ink-500 dark:text-ink-400">AI-predicted revenue + staffing → one-click draft week</div>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function Action({
  onClick, icon: Icon, label, desc, busy = false,
}: {
  onClick: () => void; icon: any; label: string; desc: string; busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition flex items-start gap-2.5 disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-4 h-4 mt-0.5 text-ink-400 animate-spin shrink-0" /> : <Icon className="w-4 h-4 mt-0.5 text-ink-500 dark:text-ink-400 shrink-0" />}
      <div>
        <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">{label}</div>
        <div className="text-[11px] text-ink-500 dark:text-ink-400">{desc}</div>
      </div>
    </button>
  );
}
