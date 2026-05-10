"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export function ClaimButton({ shiftId, variant = "primary" }: { shiftId: string; variant?: "primary" | "secondary" }) {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setLoading(true); setError(null);
    const res = await fetch(`/api/shifts/${shiftId}/claim`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Could not claim"); return; }
    r.refresh();
  }

  return (
    <div className="text-right">
      <button onClick={claim} disabled={loading} className={variant === "primary" ? "btn-primary text-xs" : "btn-outline text-xs"}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {loading ? "Claiming…" : "Claim shift"}
      </button>
      {error && <div className="text-[11px] text-rose-600 mt-1">{error}</div>}
    </div>
  );
}
