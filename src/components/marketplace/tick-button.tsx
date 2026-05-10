"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

export function TickButton() {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function tick() {
    setBusy(true); setSummary(null);
    const res = await fetch(`/api/coverage/tick`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setSummary(data.error ?? "Failed"); return; }
    setSummary(`Expired ${data.expired} · advanced ${data.advanced} · escalated ${data.escalated}`);
    r.refresh();
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button onClick={tick} disabled={busy} className="btn-outline text-xs">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {busy ? "Running…" : "Run autopilot"}
      </button>
      {summary && <div className="text-[10px] text-ink-500 mt-1">{summary}</div>}
    </div>
  );
}
