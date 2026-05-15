"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function ApplyButton({ locationId, weekStart }: { locationId: string; weekStart: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  const confirm = useConfirm();
  async function go() {
    const ok = await confirm({
      title: "Generate draft shifts from this forecast?",
      description: "Existing draft shifts at this location for the week will be replaced. Published shifts are untouched.",
      tone: "warning",
      confirmLabel: "Apply forecast",
    });
    if (!ok) return;
    setBusy(true); setError(null); setCreated(null);
    const res = await fetch("/api/forecast/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, weekStart }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setCreated(data.created ?? 0);
    r.refresh();
  }
  return (
    <div className="inline-flex flex-col items-end">
      <button onClick={go} disabled={busy} className="btn-outline text-xs">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
        {busy ? "Applying…" : "Apply as draft week"}
      </button>
      {error   && <div className="text-[10px] text-rose-600 mt-1">{error}</div>}
      {created !== null && <div className="text-[10px] text-emerald-700 mt-1">Created {created} draft shifts — open Schedule to assign.</div>}
    </div>
  );
}
