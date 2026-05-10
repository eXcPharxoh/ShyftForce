"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function DisconnectButton({ id }: { id: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!confirm("Disconnect this POS connection? Existing revenue snapshots will be kept.")) return;
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
