"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

export function ImpersonationBanner({ adminEmail, targetName, targetEmail }: { adminEmail: string; targetName: string; targetEmail: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);

  async function end() {
    setBusy(true);
    await fetch("/api/platform/impersonate", { method: "DELETE" });
    r.push("/platform/users");
  }

  return (
    <div className="bg-rose-600 text-white px-4 py-2 text-xs flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="font-semibold shrink-0">⚠ Impersonating</span>
        <span className="text-white/90 truncate">{targetName} ({targetEmail})</span>
        <span className="text-white/70 hidden sm:inline">· logged in as <span className="font-mono">{adminEmail}</span></span>
      </div>
      <button onClick={end} disabled={busy} className="bg-white/15 hover:bg-white/25 px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 shrink-0">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        End impersonation
      </button>
    </div>
  );
}
