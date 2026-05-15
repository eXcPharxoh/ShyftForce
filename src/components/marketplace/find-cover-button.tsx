"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function FindCoverButton({ shiftId, size = "sm" }: { shiftId: string; size?: "sm" | "md" }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const confirm = useConfirm();

  async function go() {
    if (busy) return;
    const ok = await confirm({
      title: "Open this shift for cover?",
      description: "The top 3 eligible teammates will get a DM right now.",
      confirmLabel: "Find cover",
    });
    if (!ok) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/shifts/${shiftId}/find-cover`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setDone(data.offersSent ?? 0);
    r.refresh();
    setTimeout(() => setDone(0), 4000);
  }

  const cls = size === "md" ? "btn-primary text-xs" : "btn-outline text-[11px] py-1 px-2";
  return (
    <div className="inline-flex flex-col items-end">
      <button onClick={go} disabled={busy} className={cls}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        {busy ? "Opening…" : done > 0 ? `Sent ${done}` : "Find cover"}
      </button>
      {error && <div className="text-[10px] text-rose-600 mt-0.5">{error}</div>}
    </div>
  );
}
