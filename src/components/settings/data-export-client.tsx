"use client";
import { useState } from "react";
import { Loader2, Download, RefreshCw, AlertCircle } from "lucide-react";

type Exp = {
  id: string;
  status: string;
  sizeBytes: number | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
};

export function DataExportClient({ initialExport }: { initialExport: Exp | null }) {
  const [last, setLast] = useState<Exp | null>(initialExport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true); setError(null);
    const res = await fetch("/api/me/data-export", { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setLast({
      id: d.id, status: "ready", sizeBytes: d.sizeBytes,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      expiresAt: typeof d.expiresAt === "string" ? d.expiresAt : new Date(d.expiresAt).toISOString(),
    });
  }

  const ready = last?.status === "ready" && last.expiresAt && new Date(last.expiresAt) > new Date();

  return (
    <div className="space-y-3">
      {ready && last && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-3 flex items-center gap-3">
          <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Your export is ready</div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
              {((last.sizeBytes ?? 0) / 1024).toFixed(1)} KB · expires {new Date(last.expiresAt!).toLocaleDateString()}
            </div>
          </div>
          <a href={`/api/me/data-export/${last.id}/download`} className="btn-primary text-xs">
            <Download className="w-3.5 h-3.5" /> Download JSON
          </a>
        </div>
      )}
      <button onClick={generate} disabled={busy} className="btn-outline">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {ready ? "Generate a fresh export" : "Generate data export"}
      </button>
      {error && <div className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</div>}
    </div>
  );
}
