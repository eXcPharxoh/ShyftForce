"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

export function CancelPostButton({ offerId }: { offerId: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!confirm("Withdraw this network post? The shift goes back to your internal team.")) return;
    setBusy(true);
    await fetch(`/api/network/post/${offerId}`, { method: "DELETE" });
    setBusy(false);
    r.refresh();
  }
  return (
    <button onClick={go} disabled={busy} className="btn-ghost text-rose-600 dark:text-rose-400 text-xs">
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
      Withdraw
    </button>
  );
}
