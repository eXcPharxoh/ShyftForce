"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function ClaimNetworkButton({ offerId }: { offerId: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  async function go() {
    const ok = await confirm({
      title: "Claim this shift?",
      description: "You're committing to show up. No-shows hurt your reputation score on the network.",
      confirmLabel: "Claim shift",
    });
    if (!ok) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/network/claim/${offerId}`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    r.refresh();
  }
  return (
    <div className="inline-flex flex-col items-end">
      <button onClick={go} disabled={busy} className="btn-primary text-xs">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        Claim shift
      </button>
      {error && <div className="text-[10px] text-rose-600 mt-0.5">{error}</div>}
    </div>
  );
}
