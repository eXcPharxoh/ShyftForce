"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function CantMakeItButton({ shiftId }: { shiftId: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const confirm = useConfirm();

  async function go() {
    if (busy) return;
    const ok = await confirm({
      title: "Release this shift?",
      description: "Teammates will be asked to cover and your manager will be notified.",
      tone: "warning",
      confirmLabel: "Release shift",
    });
    if (!ok) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/shifts/${shiftId}/call-out`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setDone(true);
    r.refresh();
  }

  return (
    <div className="inline-flex flex-col">
      <button onClick={go} disabled={busy || done} className="btn-outline text-xs border-rose-300 text-rose-700 dark:text-rose-300 dark:border-rose-500/40">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarX className="w-3.5 h-3.5" />}
        {busy ? "Releasing…" : done ? "Released — looking for cover" : "Can't make it"}
      </button>
      {error && <div className="text-[11px] text-rose-600 mt-0.5">{error}</div>}
    </div>
  );
}
