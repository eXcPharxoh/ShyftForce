"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

export function SyncButton() {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  async function go() {
    setBusy(true); setSummary(null);
    const res = await fetch("/api/pos/sync", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setSummary(data.error ?? "Failed"); return; }
    setSummary(`Synced ${data.connections} connection${data.connections === 1 ? "" : "s"}`);
    r.refresh();
  }
  return (
    <div className="inline-flex flex-col items-end">
      <button onClick={go} disabled={busy} className="btn-outline text-xs">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {busy ? "Syncing…" : "Sync now"}
      </button>
      {summary && <div className="text-[10px] text-ink-500 mt-1">{summary}</div>}
    </div>
  );
}
