"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function CancelPostButton({ offerId }: { offerId: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  async function go() {
    const ok = await confirm({
      title: "Withdraw network post?",
      description: "The shift goes back to your internal team.",
      tone: "warning",
      confirmLabel: "Withdraw",
    });
    if (!ok) return;
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
