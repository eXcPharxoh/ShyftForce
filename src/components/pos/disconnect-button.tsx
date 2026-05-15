"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DisconnectButton({ id }: { id: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  async function go() {
    const ok = await confirm({
      title: "Disconnect this POS?",
      description: "Existing revenue snapshots are preserved — you'll just stop receiving new data.",
      tone: "warning",
      confirmLabel: "Disconnect",
    });
    if (!ok) return;
    setBusy(true);
    await fetch(`/api/pos/connections/${id}`, { method: "DELETE" });
    setBusy(false);
    r.refresh();
  }
  return (
    <button onClick={go} disabled={busy} className="btn-ghost text-rose-600 dark:text-rose-400 text-xs">
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      Disconnect
    </button>
  );
}
