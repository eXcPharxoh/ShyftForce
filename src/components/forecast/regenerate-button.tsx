"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Loader2 } from "lucide-react";

export function RegenerateButton({ locationId, weekStart }: { locationId: string; weekStart: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  async function go() {
    setBusy(true); setError(null); setDone(null);
    const res = await fetch("/api/forecast/regenerate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, weekStart }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setDone(`${data.slots} slots · $${(data.totalPredictedRevenueCents/100).toFixed(0)} predicted · ${data.historySamples} history samples`);
    r.refresh();
    setTimeout(() => setDone(null), 5000);
  }
  return (
    <div className="inline-flex flex-col items-end">
      <button onClick={go} disabled={busy} className="btn-primary text-xs">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {busy ? "Forecasting…" : "Regenerate forecast"}
      </button>
      {done && <div className="text-[10px] text-emerald-700 mt-1">{done}</div>}
      {error && <div className="text-[10px] text-rose-600 mt-1">{error}</div>}
    </div>
  );
}
