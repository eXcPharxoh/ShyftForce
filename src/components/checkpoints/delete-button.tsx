"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeleteCheckpointButton({ id }: { id: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  async function go() {
    const ok = await confirm({
      title: "Deactivate checkpoint?",
      description: "Scan history will be preserved. You can re-activate later.",
      tone: "warning",
      confirmLabel: "Deactivate",
    });
    if (!ok) return;
    setBusy(true);
    await fetch(`/api/checkpoints/${id}`, { method: "DELETE" });
    setBusy(false);
    r.refresh();
  }
  return (
    <button onClick={go} disabled={busy} aria-label="Deactivate checkpoint" className="btn-ghost text-rose-600 text-xs">
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}
